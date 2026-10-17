'use strict';

/**
 * 공공예약 관리자 > 예약관리 > 예약현황관리 목록 화면에 붙는 스크립트.
 *
 * 1) 서비스마다 체크박스를 붙인다.
 * 2) 오른쪽 아래 패널에서 이용일 범위·사유를 고르고 "회차 확인"을 누르면 회차 목록(개인정보 없음)을 미리 보여 준다.
 * 3) "RAIM으로 보내기"를 누르면 서비스마다 엑셀을 1건씩 받아 RAIM Manager 출석부 탭으로 넘긴다.
 *    "ZIP으로 저장"을 누르면 엑셀들을 ZIP 하나로 저장한다 (출석부 탭에 ZIP을 끌어다 놓으면 된다).
 *
 * 화면에 쓰는 글자는 모두 textContent로 넣는다 (사이트 데이터를 HTML로 해석하지 않는다).
 */
(() => {
  if (document.documentElement.dataset.raimExtList === 'ready') return;
  document.documentElement.dataset.raimExtList = 'ready';

  const EXT = globalThis.RAIM_EXT;
  const API = globalThis.RAIM_YEYAK;

  // ───────────────────────── 목록 읽기 ─────────────────────────

  const findTable = () =>
    Array.from(document.querySelectorAll('table')).find((table) =>
      Array.from(table.querySelectorAll('thead th')).some((th) => th.textContent.includes('이용기간')),
    ) || null;

  const columnIndex = (table, label) =>
    Array.from(table.querySelectorAll('thead th')).findIndex((th) => th.textContent.replace(/\s+/g, '').includes(label));

  /** 목록의 서비스 행을 읽는다 (서비스 ID·이름·상태·이용기간) */
  const readServices = () => {
    const table = findTable();
    if (!table) return [];
    const periodCol = columnIndex(table, '이용기간');
    const statusCol = columnIndex(table, '상태');

    return Array.from(table.querySelectorAll('tbody > tr'))
      .map((row) => {
        const trigger = row.querySelector('[onclick*="fnReservInfoPopup("], [onclick*="fnCalPopup("]');
        const matched = trigger && (trigger.getAttribute('onclick') || '').match(/\(\s*'(S\d+)'/);
        if (!matched) return null;
        const sid = matched[1];

        const link = row.querySelector('a[onclick*="fnReservInfoPopup("]');
        const rawName = ((link && link.textContent) || '').replace(/\s+/g, ' ').trim();
        const name = rawName.replace(new RegExp(`\\(\\s*${sid}\\s*\\)\\s*$`), '').trim() || sid;
        const cells = row.children;
        const period = API.parsePeriod(periodCol >= 0 && cells[periodCol] ? cells[periodCol].textContent : '');
        const status = statusCol >= 0 && cells[statusCol] ? cells[statusCol].textContent.trim() : '';
        const category = ((row.querySelector('.text-primary') || {}).textContent || '').replace(/\s+/g, ' ').trim();

        return { sid, name, status, category, period, row, firstCell: cells[0] || null };
      })
      .filter(Boolean);
  };

  // ───────────────────────── 날짜 도우미 ─────────────────────────

  const pad = (number) => String(number).padStart(2, '0');
  const dateToYmd = (date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const ymdToInput = (ymd) => (ymd ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : '');
  const ymdToShort = (ymd) => `${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
  const addDays = (date, days) => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  };

  /** 이번 주말(토·일). 일요일이면 어제~오늘. */
  const weekendOf = (base) => {
    const day = base.getDay();
    const saturday = day === 0 ? addDays(base, -1) : addDays(base, 6 - day);
    return { from: dateToYmd(saturday), to: dateToYmd(addDays(saturday, 1)) };
  };

  /** 파일 이름에 쓸 짧은 서비스명 (연령·기간 표기 [..] 제거, 파일명 금지 문자 제거) */
  const shortServiceName = (name) =>
    name
      .replace(/^(\s*\[[^\]]*\]\s*)+/, '')
      .replace(/[\\/:*?"<>|'#%&{}$!@+`=]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40) || '서비스';

  // ───────────────────────── 패널 ─────────────────────────

  const STYLE = `
    :host { all: initial; }
    .panel { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; width: 340px; max-height: 82vh;
      display: flex; flex-direction: column; background: #fff; color: #1f2937; border: 1px solid #d1d5db;
      border-radius: 14px; box-shadow: 0 12px 32px rgba(15, 23, 42, .18); font: 13px/1.5 "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif; }
    .panel.collapsed { width: auto; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px;
      background: #0f3d91; color: #fff; border-radius: 13px 13px 0 0; cursor: pointer; user-select: none; }
    .panel.collapsed header { border-radius: 13px; }
    header strong { font-size: 13px; }
    header .count { background: rgba(255,255,255,.2); border-radius: 999px; padding: 0 8px; font-size: 12px; }
    .body { padding: 12px; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
    .panel.collapsed .body { display: none; }
    .muted { color: #6b7280; font-size: 12px; }
    .selected { margin: 0; font-size: 12px; }
    fieldset { border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 10px; margin: 0; }
    legend { font-size: 12px; font-weight: 700; padding: 0 4px; }
    label { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .dates { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
    .dates input { flex: 1; min-width: 0; font: inherit; font-size: 12px; padding: 3px 4px; border: 1px solid #d1d5db; border-radius: 6px; }
    .quick { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
    select { font: inherit; font-size: 12px; padding: 3px 4px; border: 1px solid #d1d5db; border-radius: 6px; flex: 1; }
    button { font: inherit; font-size: 12px; border-radius: 8px; border: 1px solid #d1d5db; background: #f9fafb; color: #111827;
      padding: 6px 10px; cursor: pointer; }
    button:hover:not(:disabled) { background: #f3f4f6; }
    button:disabled { opacity: .45; cursor: not-allowed; }
    button.primary { background: #0f62fe; border-color: #0f62fe; color: #fff; font-weight: 700; }
    button.primary:hover:not(:disabled) { background: #0b4fd1; }
    header button { background: transparent; border: 0; color: #fff; padding: 0 2px; font-size: 12px; }
    .actions { display: flex; gap: 6px; }
    .actions button { flex: 1; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    li { font-size: 12px; padding: 6px 8px; border-radius: 8px; background: #f9fafb; border: 1px solid #f3f4f6; word-break: keep-all; }
    li.ok { background: #ecfdf5; border-color: #a7f3d0; }
    li.warn { background: #fffbeb; border-color: #fde68a; }
    li.error { background: #fef2f2; border-color: #fecaca; }
    li.skip { color: #6b7280; }
    .notice { margin: 0; font-size: 12px; padding: 8px; border-radius: 8px; background: #eff6ff; color: #1e3a8a; }
    .notice:empty { display: none; }
    .notice.error { background: #fef2f2; color: #991b1b; }
    .small { font-size: 11px; color: #6b7280; margin: 0; }
  `;

  const host = document.createElement('div');
  host.id = 'raim-ext-panel-host';
  const root = host.attachShadow({ mode: 'closed' });
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  root.appendChild(styleEl);

  const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('data-')) node.setAttribute(key, value);
      else node[key] = value;
    });
    children.forEach((child) => node.appendChild(child));
    return node;
  };

  const ui = {};
  ui.count = el('span', { class: 'count', text: '0' });
  ui.toggle = el('button', { type: 'button', text: '접기' });
  ui.header = el('header', {}, [el('strong', { text: 'RAIM 출석부 보내기' }), ui.count, ui.toggle]);
  ui.selected = el('p', { class: 'selected muted', text: '목록 왼쪽 체크박스로 서비스를 고르세요.' });

  ui.rangeAll = el('input', { type: 'radio', name: 'range', value: 'all', checked: true });
  ui.rangeCustom = el('input', { type: 'radio', name: 'range', value: 'custom' });
  ui.from = el('input', { type: 'date', ariaLabel: '시작일' });
  ui.to = el('input', { type: 'date', ariaLabel: '종료일' });
  ui.quickToday = el('button', { type: 'button', text: '오늘' });
  ui.quickWeekend = el('button', { type: 'button', text: '이번 주말' });
  ui.quickNext = el('button', { type: 'button', text: '다음 주말' });
  ui.range = el('fieldset', {}, [
    el('legend', { text: '이용일' }),
    el('label', {}, [ui.rangeAll, document.createTextNode('서비스 이용기간 전체')]),
    el('label', {}, [ui.rangeCustom, document.createTextNode('기간 지정')]),
    el('div', { class: 'dates' }, [ui.from, document.createTextNode('~'), ui.to]),
    el('div', { class: 'quick' }, [ui.quickToday, ui.quickWeekend, ui.quickNext]),
  ]);

  ui.reason = el('select', { ariaLabel: '다운로드 사유' });
  EXT.REASONS.forEach((reason) => ui.reason.appendChild(el('option', { value: reason.code, text: reason.text })));
  ui.reasonRow = el('label', {}, [document.createTextNode('다운로드 사유'), ui.reason]);

  ui.preview = el('button', { type: 'button', class: 'primary', text: '1. 회차 확인' });
  ui.previewList = el('ul');
  ui.send = el('button', { type: 'button', class: 'primary', text: '2. RAIM으로 보내기', disabled: true });
  ui.save = el('button', { type: 'button', text: 'ZIP으로 저장', disabled: true });
  ui.notice = el('p', { class: 'notice' });
  ui.resultList = el('ul');
  ui.footnote = el('p', {
    class: 'small',
    text: '엑셀은 사이트의 엑셀 출력과 같은 방식으로 받아서, 서비스마다 다운로드 사유가 기록됩니다. 한 번에 최대 20개 서비스까지 처리합니다.',
  });

  ui.body = el('div', { class: 'body' }, [
    ui.selected,
    ui.range,
    ui.reasonRow,
    ui.preview,
    ui.previewList,
    el('div', { class: 'actions' }, [ui.send, ui.save]),
    ui.notice,
    ui.resultList,
    ui.footnote,
  ]);
  ui.panel = el('div', { class: 'panel collapsed' }, [ui.header, ui.body]);
  root.appendChild(ui.panel);
  document.body.appendChild(host);

  // ───────────────────────── 상태 ─────────────────────────

  const state = {
    services: [],
    selected: new Set(),
    settings: { ...EXT.DEFAULT_SETTINGS },
    /** 회차 확인 결과: [{ service, period, units, expected, skip }] */
    plan: null,
    busy: false,
    /** 마지막으로 보낸 묶음 ID와 파일 (결과 대조용, 개인정보 없음) */
    batchId: '',
    sent: [],
    waitTimer: 0,
  };

  const setCollapsed = (collapsed) => {
    ui.panel.classList.toggle('collapsed', collapsed);
    ui.toggle.textContent = collapsed ? '열기' : '접기';
  };

  const setNotice = (text, isError = false) => {
    ui.notice.textContent = text || '';
    ui.notice.classList.toggle('error', Boolean(isError));
  };

  const selectedServices = () => state.services.filter((service) => state.selected.has(service.sid));

  const customRange = () => {
    if (!ui.rangeCustom.checked) return null;
    const from = API.toYmd(ui.from.value);
    const to = API.toYmd(ui.to.value || ui.from.value);
    if (!from || !to) return undefined;
    return from <= to ? { from, to } : { from: to, to: from };
  };

  const reasonText = () => EXT.reasonText(ui.reason.value);

  const refreshButtons = () => {
    const runnable = state.plan ? state.plan.filter((item) => !item.skip) : [];
    ui.preview.disabled = state.busy || state.selected.size === 0;
    ui.send.disabled = state.busy || runnable.length === 0;
    ui.save.disabled = state.busy || runnable.length === 0;
    [ui.rangeAll, ui.rangeCustom, ui.from, ui.to, ui.quickToday, ui.quickWeekend, ui.quickNext, ui.reason].forEach((input) => {
      input.disabled = state.busy;
    });
  };

  const renderSelection = () => {
    const services = selectedServices();
    ui.count.textContent = String(services.length);
    if (services.length === 0) {
      ui.selected.textContent = '목록 왼쪽 체크박스로 서비스를 고르세요.';
    } else {
      const names = services.slice(0, 3).map((service) => shortServiceName(service.name));
      const more = services.length > 3 ? ` 외 ${services.length - 3}개` : '';
      ui.selected.textContent = `선택 ${services.length}개: ${names.join(', ')}${more}`;
    }
    refreshButtons();
  };

  /** 선택·기간이 바뀌면 이전 회차 확인 결과는 버린다 */
  const invalidatePlan = () => {
    if (state.busy) return;
    state.plan = null;
    ui.previewList.replaceChildren();
    setNotice('');
    refreshButtons();
  };

  const addItem = (list, text, kind) => {
    const item = el('li', { class: kind || '', text });
    list.appendChild(item);
    return item;
  };

  // ───────────────────────── 체크박스 붙이기 ─────────────────────────

  const attachCheckboxes = () => {
    state.services = readServices();
    const table = findTable();

    state.services.forEach((service) => {
      if (!service.firstCell || service.firstCell.querySelector('.raim-ext-check')) return;
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'raim-ext-check';
      box.title = 'RAIM 출석부로 보낼 서비스 선택';
      box.style.cssText = 'width:16px;height:16px;margin:0 8px 0 0;vertical-align:middle;cursor:pointer;accent-color:#0f62fe;';
      box.checked = state.selected.has(service.sid);
      box.addEventListener('click', (event) => event.stopPropagation());
      box.addEventListener('change', () => {
        if (box.checked) state.selected.add(service.sid);
        else state.selected.delete(service.sid);
        if (box.checked && state.selected.size === 1) setCollapsed(false);
        renderSelection();
        invalidatePlan();
      });
      const container = service.firstCell.querySelector('.outBox1') || service.firstCell;
      container.insertBefore(box, container.firstChild);
    });

    const headCell = table && table.querySelector('thead th');
    if (headCell && !headCell.querySelector('.raim-ext-check-all')) {
      const all = document.createElement('input');
      all.type = 'checkbox';
      all.className = 'raim-ext-check-all';
      all.title = '이 페이지의 서비스 모두 선택';
      all.style.cssText = 'width:16px;height:16px;margin:0 8px 0 0;vertical-align:middle;cursor:pointer;accent-color:#0f62fe;';
      all.addEventListener('change', () => {
        state.services.forEach((service) => {
          if (all.checked) state.selected.add(service.sid);
          else state.selected.delete(service.sid);
        });
        document.querySelectorAll('.raim-ext-check').forEach((box) => {
          box.checked = all.checked;
        });
        if (all.checked) setCollapsed(false);
        renderSelection();
        invalidatePlan();
      });
      headCell.insertBefore(all, headCell.firstChild);
    }
    renderSelection();
  };

  // ───────────────────────── 1. 회차 확인 ─────────────────────────

  const buildPlan = async () => {
    const services = selectedServices();
    if (services.length === 0) return;
    if (services.length > EXT.LIMITS.maxServices) {
      setNotice(`한 번에 ${EXT.LIMITS.maxServices}개까지 처리합니다. 선택을 줄여 주세요.`, true);
      return;
    }
    const range = customRange();
    if (range === undefined) {
      setNotice('기간 지정을 골랐다면 시작일을 넣어 주세요.', true);
      return;
    }

    state.busy = true;
    state.plan = null;
    refreshButtons();
    ui.previewList.replaceChildren();
    ui.resultList.replaceChildren();
    setNotice('회차 목록을 확인하는 중…');

    const plan = [];
    try {
      for (let index = 0; index < services.length; index += 1) {
        const service = services[index];
        const label = shortServiceName(service.name);
        if (!service.period) {
          plan.push({ service, skip: '이용기간을 읽지 못함' });
          addItem(ui.previewList, `– ${label}: 이용기간을 읽지 못해 건너뜁니다.`, 'skip');
          continue;
        }
        const period = API.intersectPeriod(service.period, range);
        if (!period) {
          plan.push({ service, skip: '기간 밖' });
          addItem(ui.previewList, `– ${label}: 고른 기간에 이용일이 없어 건너뜁니다.`, 'skip');
          continue;
        }
        if (index > 0) await API.sleep(400);
        const units = await API.fetchUnits(service.sid, period);
        const withRequests = units.filter((unit) => unit.requests > 0);
        const requestSum = units.reduce((sum, unit) => sum + unit.requests, 0);
        const periodText = `${ymdToShort(period.from)}~${ymdToShort(period.to)}`;

        if (withRequests.length === 0) {
          plan.push({ service, period, units, expected: 0, skip: '신청 없음' });
          addItem(ui.previewList, `– ${label} (${periodText}): 신청이 있는 회차가 없어 건너뜁니다.`, 'skip');
          continue;
        }
        if (requestSum > EXT.LIMITS.maxRowsPerFile * 0.8) {
          plan.push({ service, period, units, expected: withRequests.length, skip: '건수 많음' });
          addItem(ui.previewList, `– ${label}: 신청이 너무 많습니다. 기간을 나눠서 받아 주세요.`, 'warn');
          continue;
        }
        plan.push({ service, period, units, expected: withRequests.length, skip: '' });
        addItem(ui.previewList, `✓ ${label} (${periodText}) · 신청 있는 회차 ${withRequests.length}개`, 'ok');
      }

      state.plan = plan;
      const runnable = plan.filter((item) => !item.skip).length;
      setNotice(
        runnable > 0
          ? `엑셀 ${runnable}건을 받습니다. 공공예약에 다운로드 사유 "${reasonText()}"(으)로 ${runnable}건 기록됩니다.`
          : '받을 엑셀이 없습니다.',
      );
    } catch (error) {
      state.plan = null;
      setNotice(error && error.message ? error.message : '회차 목록을 확인하지 못했습니다.', true);
    } finally {
      state.busy = false;
      refreshButtons();
    }
  };

  // ───────────────────────── 2. 엑셀 받기 ─────────────────────────

  const fetchAll = async () => {
    const targets = (state.plan || []).filter((item) => !item.skip);
    const files = [];
    let totalBytes = 0;
    const reason = reasonText();

    for (let index = 0; index < targets.length; index += 1) {
      const { service, period, expected } = targets[index];
      const label = shortServiceName(service.name);
      const line = addItem(ui.resultList, `… ${label}: 엑셀 받는 중`);
      if (index > 0) await API.sleep(state.settings.gapMs);

      const blob = await API.fetchServiceExcel({ sid: service.sid, serviceName: service.name, period, reasonText: reason });
      totalBytes += blob.size;
      if (totalBytes > EXT.LIMITS.maxTotalBytes) {
        throw new Error('받은 파일이 너무 큽니다. 서비스 수나 기간을 줄여 주세요.');
      }
      files.push({
        id: `${service.sid}_${period.from}_${period.to}`,
        name: `${label}_${service.sid}_${period.from}-${period.to}.xlsx`,
        label,
        expected,
        blob,
      });
      line.textContent = `✓ ${label}: 엑셀 받음`;
      line.className = 'ok';
    }
    return files;
  };

  const run = async (mode) => {
    if (state.busy || !state.plan) return;
    state.busy = true;
    refreshButtons();
    ui.resultList.replaceChildren();
    clearTimeout(state.waitTimer);
    // 이전 묶음의 결과가 늦게 와도 새 작업과 섞이지 않게 한다
    state.batchId = '';
    state.sent = [];
    setNotice('엑셀을 받는 중입니다. 이 화면을 닫지 마세요.');

    let files = [];
    try {
      files = await fetchAll();

      if (mode === 'send') {
        const encoded = await Promise.all(
          files.map(async ({ id, name, blob }) => ({ id, name, base64: await API.blobToBase64(blob) })),
        );
        // 결과가 보내기 응답보다 먼저 올 수 있어, 대조할 목록을 먼저 정해 둔다
        const batchId = crypto.randomUUID();
        state.batchId = batchId;
        state.sent = files.map(({ id, label, expected }) => ({ id, label, expected }));
        const response = await chrome.runtime.sendMessage({
          type: 'STAGE_IMPORT',
          payload: { version: EXT.BRIDGE_VERSION, batchId, files: encoded },
        });
        encoded.length = 0;
        if (!response || !response.ok) {
          state.batchId = '';
          state.sent = [];
          throw new Error((response && response.error) || 'RAIM 탭을 열지 못했습니다.');
        }
        if (state.batchId === batchId) setNotice('RAIM 출석부 탭으로 넘겼습니다. 탭에서 파일을 읽으면 여기에 결과가 나옵니다.');
        state.waitTimer = setTimeout(() => {
          if (state.batchId !== batchId) return;
          setNotice(
            'RAIM 탭에서 아직 파일을 받지 않았습니다. 로그인·PIN·프로그램 선택을 마치고 출석부 탭을 열면 5분 안에는 자동으로 들어갑니다.',
          );
        }, 30000);
      } else {
        // 여러 파일을 ZIP 하나로 묶어 blob으로 저장한다 (data: URL은 다운로드 기록에 내용이 남을 수 있어 쓰지 않는다)
        const entries = await Promise.all(
          files.map(async ({ name, blob }) => ({ name, bytes: new Uint8Array(await blob.arrayBuffer()) })),
        );
        const zip = globalThis.RAIM_ZIP.buildZip(entries);
        entries.length = 0;
        const stamp = new Date();
        // 파일명에 한글을 넣으면 일부 환경(로케일 없는 리눅스 등)에서 이름이 'download'로 바뀌어 영문으로 둔다
        const zipName = `RAIM_reservations_${dateToYmd(stamp)}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}.zip`;
        const url = URL.createObjectURL(zip);
        // 링크는 닫힌 섀도 루트 안에만 잠깐 붙인다 (사이트 스크립트가 blob 주소를 보지 못하게)
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = zipName;
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        root.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setNotice(`${zipName} 파일(엑셀 ${files.length}개)을 저장했습니다. RAIM 출석부 탭에 이 ZIP을 끌어다 놓으세요.`);
      }
    } catch (error) {
      setNotice(error && error.message ? error.message : '엑셀을 받지 못했습니다.', true);
      addItem(ui.resultList, '작업을 멈췄습니다. 받은 파일은 넘기지 않았습니다.', 'error');
    } finally {
      // 받은 파일 내용은 여기서 바로 놓아 준다 (넘긴 뒤에는 화면에 남길 이유가 없다)
      files.length = 0;
      state.busy = false;
      refreshButtons();
    }
  };

  // ───────────────────────── RAIM 결과 받기 ─────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== 'IMPORT_RESULT') return;
    // 지금 기다리는 묶음의 결과만 받는다
    if (!state.batchId || message.batchId !== state.batchId || state.sent.length === 0) return;
    state.batchId = '';
    clearTimeout(state.waitTimer);
    ui.resultList.replaceChildren();

    if (message.error || !Array.isArray(message.results) || message.results.length === 0) {
      setNotice('RAIM 출석부 탭이 파일을 읽지 못했습니다. 출석부 탭의 안내 메시지를 확인해 주세요.', true);
      return;
    }

    let warnings = 0;
    state.sent.forEach((sent) => {
      const result = message.results.find((item) => item && item.id === sent.id);
      const sessions = result && result.ok ? Number(result.sessions) || 0 : 0;
      if (!result || !result.ok) {
        warnings += 1;
        addItem(ui.resultList, `✕ ${sent.label}: RAIM이 파일을 읽지 못했습니다.`, 'error');
      } else if (sessions < sent.expected) {
        warnings += 1;
        addItem(
          ui.resultList,
          `⚠ ${sent.label}: 출석부 회차 ${sessions}개 / 사이트 회차 ${sent.expected}개 — 빠진 회차가 있는지 확인해 주세요.`,
          'warn',
        );
      } else {
        addItem(ui.resultList, `✓ ${sent.label}: 출석부 회차 ${sessions}개`, 'ok');
      }
    });
    setNotice(
      warnings === 0
        ? 'RAIM 출석부 탭에 모두 들어갔습니다. 출석부 탭에서 내려받으면 됩니다.'
        : `RAIM 출석부 탭에 넘겼지만 ${warnings}개 서비스는 확인이 필요합니다.`,
      warnings > 0,
    );
  });

  // ───────────────────────── 이벤트 연결 ─────────────────────────

  ui.header.addEventListener('click', () => setCollapsed(!ui.panel.classList.contains('collapsed')));

  const setRange = ({ from, to }) => {
    ui.rangeCustom.checked = true;
    ui.from.value = ymdToInput(from);
    ui.to.value = ymdToInput(to);
    invalidatePlan();
  };
  ui.quickToday.addEventListener('click', () => {
    const today = dateToYmd(new Date());
    setRange({ from: today, to: today });
  });
  ui.quickWeekend.addEventListener('click', () => setRange(weekendOf(new Date())));
  ui.quickNext.addEventListener('click', () => setRange(weekendOf(addDays(new Date(), 7))));
  [ui.rangeAll, ui.rangeCustom].forEach((radio) => radio.addEventListener('change', invalidatePlan));
  [ui.from, ui.to].forEach((input) =>
    input.addEventListener('change', () => {
      ui.rangeCustom.checked = true;
      invalidatePlan();
    }),
  );
  ui.reason.addEventListener('change', () => {
    if (state.plan) {
      const runnable = state.plan.filter((item) => !item.skip).length;
      if (runnable > 0) {
        setNotice(`엑셀 ${runnable}건을 받습니다. 공공예약에 다운로드 사유 "${reasonText()}"(으)로 ${runnable}건 기록됩니다.`);
      }
    }
  });
  ui.preview.addEventListener('click', buildPlan);
  ui.send.addEventListener('click', () => run('send'));
  ui.save.addEventListener('click', () => run('save'));

  EXT.loadSettings()
    .then((settings) => {
      state.settings = settings;
      ui.reason.value = settings.reasonCode;
    })
    .catch(() => {
      ui.reason.value = EXT.DEFAULT_SETTINGS.reasonCode;
    });

  attachCheckboxes();
  refreshButtons();
})();
