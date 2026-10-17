'use strict';

/**
 * 공공예약 관리자 사이트에 보내는 요청을 모아 둔 곳.
 *
 * [지켜야 할 것]
 * - 사이트에 보내는 요청은 ENDPOINTS 두 개뿐이다. 추첨·문자발송·예약 수정처럼 상태를 바꾸는 요청은 넣지 않는다.
 * - 명단 JSON(selectResevUserListAjax.do)은 쓰지 않는다. 다운로드 사유가 기록되는 엑셀 출력만 쓴다.
 * - 예약자 정보는 console에 찍지 않고, 저장소에도 넣지 않는다.
 *
 * 사이트가 개편돼 주소나 파라미터가 바뀌면 이 파일만 고치면 된다.
 * 파라미터는 관리자 화면의 "예약현황" 팝업(서비스명 클릭 → 엑셀 출력)이 보내는 값과 같다.
 */
(() => {
  const ENDPOINTS = Object.freeze({
    /** 서비스의 월별 회차 목록 (회차명·이용일·신청 수, 개인정보 없음) */
    units: '/management/reserv/selectListsrvUnitAjax.do',
    /** 예약현황 엑셀 출력 (사유가 사이트에 기록된다) */
    excel: '/management/reserv/selectExcelFileDownload.do',
  });

  class SessionExpiredError extends Error {
    constructor() {
      super('공공예약 관리자 로그인이 끊겼습니다. 다시 로그인한 뒤 시도해 주세요.');
      this.name = 'SessionExpiredError';
    }
  }

  class SiteError extends Error {
    constructor(message) {
      super(message || '공공예약 사이트가 요청을 처리하지 못했습니다.');
      this.name = 'SiteError';
    }
  }

  const endpointUrl = (key) => {
    const path = ENDPOINTS[key];
    if (!path) throw new Error(`허용되지 않은 요청입니다: ${key}`);
    if (location.origin !== RAIM_EXT.YEYAK_ORIGIN) throw new Error('공공예약 사이트에서만 동작합니다.');
    return location.origin + path;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /** '2026.11.21' · '2026-11-21' · '20261121' → '20261121' (형식이 다르면 '') */
  const toYmd = (text) => {
    const digits = String(text || '').replace(/\D/g, '');
    return /^\d{8}$/.test(digits) ? digits : '';
  };

  /** '2026.11.21 ~ 2026.12.12' → { from: '20261121', to: '20261212' } */
  const parsePeriod = (text) => {
    const parts = String(text || '').split('~').map(toYmd);
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return parts[0] <= parts[1] ? { from: parts[0], to: parts[1] } : { from: parts[1], to: parts[0] };
  };

  /** 두 기간의 겹치는 부분 (겹치지 않으면 null) */
  const intersectPeriod = (a, b) => {
    if (!a) return null;
    if (!b) return a;
    const from = a.from > b.from ? a.from : b.from;
    const to = a.to < b.to ? a.to : b.to;
    return from <= to ? { from, to } : null;
  };

  /** '20261121'~'20270105' → ['202611', '202612', '202701'] */
  const monthsBetween = (from, to) => {
    const months = [];
    let year = Number(from.slice(0, 4));
    let month = Number(from.slice(4, 6));
    const endKey = to.slice(0, 6);
    for (let guard = 0; guard < 60; guard += 1) {
      const key = `${year}${String(month).padStart(2, '0')}`;
      months.push(key);
      if (key >= endKey) break;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return months;
  };

  /** 사이트가 &#39; 같은 HTML 엔티티를 그대로 내보내는 경우가 있어 되돌린다 */
  const decodeEntities = (text) => {
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${String(text || '')}`, 'text/html');
    return (doc.body.textContent || '').trim();
  };

  /** 로그인이 끊기면 사이트는 JSON 대신 로그인 화면(HTML)을 돌려준다 */
  const readJson = async (response) => {
    if (response.redirected && /login/i.test(response.url)) throw new SessionExpiredError();
    if (!response.ok) throw new SiteError(`공공예약 사이트 응답 오류 (${response.status})`);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      if (/<html|login|로그인/i.test(text)) throw new SessionExpiredError();
      throw new SiteError('공공예약 사이트 응답을 읽지 못했습니다.');
    }
  };

  /**
   * 서비스의 회차 목록을 가져온다 (개인정보 없음).
   * 신청 수(REQCNT)가 있는 회차는 엑셀에도 나와야 하므로, RAIM이 읽은 회차 수와 대조하는 데 쓴다.
   */
  const fetchUnits = async (sid, period, gapMs = 300) => {
    const units = [];
    const months = monthsBetween(period.from, period.to);
    for (let index = 0; index < months.length; index += 1) {
      if (index > 0) await sleep(gapMs);
      const response = await fetch(endpointUrl('units'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: new URLSearchParams({ sch_ym: months[index], svc_id: sid }),
      });
      const json = await readJson(response);
      if (json && json.resultStats && json.resultStats.resultCode === 'error') {
        throw new SiteError(json.resultStats.resultMsg);
      }
      for (const unit of (json && json.resultList) || []) {
        const useDe = toYmd(unit.USE_DE);
        if (!useDe || useDe < period.from || useDe > period.to) continue;
        units.push({
          useDe,
          name: decodeEntities(unit.TME_NM),
          hour: String(unit.USE_BEGIN_HOUR || ''),
          requests: Number(unit.REQCNT) || 0,
          capacity: Number(unit.RCRIT_NMPR) || 0,
        });
      }
    }
    return units;
  };

  /**
   * 서비스 하나의 예약현황 엑셀을 받는다 (회차를 비우면 기간 안의 모든 회차가 한 파일에 담긴다).
   * 관리자 화면의 엑셀 출력 버튼과 같은 파라미터를 보내므로 사이트에 사유가 똑같이 기록된다.
   */
  const fetchServiceExcel = async ({ sid, serviceName, period, reasonText }) => {
    const params = new URLSearchParams({
      type: '',
      sch_year: period.from.slice(0, 4),
      sch_month: period.from.slice(4, 6),
      sch_unit: '',
      tme_seq: '',
      sch_resve_unit_seq: '',
      sch_reserv_begin_dt: '',
      sch_reserv_end_dt: '',
      sch_id: '',
      sch_use_begin_dt: period.from,
      sch_use_end_dt: period.to,
      sch_nm: '',
      sch_cancel_begin_dt: '',
      sch_cancel_end_dt: '',
      sch_group_nm: '',
      sch_resve_sttus_code: '',
      sch_reserv_id: '',
      sch_setle_mth: '',
      sch_req_rsv_sttus: '',
      sch_rsv_unit_delete_yn: 'N',
      sch_setle_sttus: '',
      sch_setle_id: '',
      svc_id: sid,
      svc_nm: serviceName,
      excel_cn: reasonText,
    });

    const response = await fetch(`${endpointUrl('excel')}?${params.toString()}`, { credentials: 'include' });
    if (response.redirected && /login/i.test(response.url)) throw new SessionExpiredError();
    if (!response.ok) throw new SiteError(`엑셀 출력 실패 (${response.status})`);

    const blob = await response.blob();
    const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    // xlsx는 ZIP이라 'PK'로 시작한다. HTML이 오면 로그인 화면이거나 오류 화면이다.
    if (head[0] !== 0x50 || head[1] !== 0x4b) {
      const text = await blob.text();
      if (/login|로그인/i.test(text)) throw new SessionExpiredError();
      throw new SiteError('엑셀 대신 다른 응답이 왔습니다. 사이트에서 직접 엑셀 출력이 되는지 확인해 주세요.');
    }
    return blob;
  };

  /** Blob → base64 (확장 메시지는 JSON이라 바이너리를 그대로 못 넘긴다) */
  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
      reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
      reader.readAsDataURL(blob);
    });

  globalThis.RAIM_YEYAK = Object.freeze({
    ENDPOINTS,
    SessionExpiredError,
    SiteError,
    toYmd,
    parsePeriod,
    intersectPeriod,
    monthsBetween,
    decodeEntities,
    fetchUnits,
    fetchServiceExcel,
    blobToBase64,
    sleep,
  });
})();
