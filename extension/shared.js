'use strict';

/**
 * 확장 전체(백그라운드·콘텐츠 스크립트·옵션 화면)가 함께 쓰는 상수와 설정.
 * 여기에는 개인정보가 들어가지 않는다. 설정(사유·간격)만 chrome.storage.local에 저장한다.
 */
(() => {
  const DEFAULT_SETTINGS = Object.freeze({
    /** 엑셀 출력 사유 코드 (사이트 선택지와 같은 코드) */
    reasonCode: 'C',
    /** 사이트 요청 사이 간격 (ms) */
    gapMs: 1500,
  });

  /** 공공예약 엑셀 출력 화면의 사유 선택지 그대로 (기타는 자유 입력이라 넣지 않았다) */
  const REASONS = Object.freeze([
    Object.freeze({ code: 'A', text: '접수자 명단 확인' }),
    Object.freeze({ code: 'B', text: '프로그램 당첨자 확인' }),
    Object.freeze({ code: 'C', text: '출석부 작성' }),
    Object.freeze({ code: 'D', text: '안내문자 발송' }),
  ]);

  const clampGap = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_SETTINGS.gapMs;
    return Math.min(5000, Math.max(800, Math.round(number)));
  };

  const normalizeSettings = (raw) => {
    const source = raw && typeof raw === 'object' ? raw : {};
    const reasonCode = REASONS.some((reason) => reason.code === source.reasonCode)
      ? source.reasonCode
      : DEFAULT_SETTINGS.reasonCode;
    return { reasonCode, gapMs: clampGap(source.gapMs ?? DEFAULT_SETTINGS.gapMs) };
  };

  globalThis.RAIM_EXT = Object.freeze({
    /** 확장 ↔ RAIM 페이지 메시지 규격 버전 (src/lib/extensionBridge.ts의 BRIDGE_VERSION과 같아야 한다) */
    BRIDGE_VERSION: 1,
    YEYAK_ORIGIN: 'https://yeyak.seoul.go.kr',
    /**
     * 파일을 넘겨받을 수 있는 유일한 곳.
     * manifest.json의 externally_connectable·host_permissions와 반드시 같아야 한다.
     * (로컬 개발 때만 README의 안내대로 잠시 바꾼다)
     */
    RAIM_ORIGIN: 'https://raim.kimjihoon.me',
    REASONS,
    DEFAULT_SETTINGS,
    LIMITS: Object.freeze({
      /** 한 번에 처리하는 서비스 수 */
      maxServices: 20,
      /** 한 번에 넘기는 파일 전체 크기 (chrome.storage.session 한도 10MB 안쪽) */
      maxTotalBytes: 8 * 1024 * 1024,
      /** 출석부 탭이 파일을 가져가기를 기다리는 시간 */
      pendingTtlMs: 5 * 60 * 1000,
      /** 사이트가 한 번에 출력해 주는 최대 건수 */
      maxRowsPerFile: 10000,
    }),
    normalizeSettings,
    reasonText(code) {
      const found = REASONS.find((reason) => reason.code === code);
      return (found || REASONS.find((reason) => reason.code === DEFAULT_SETTINGS.reasonCode)).text;
    },
    async loadSettings() {
      const stored = await chrome.storage.local.get('settings');
      return normalizeSettings(stored.settings);
    },
    async saveSettings(next) {
      const settings = normalizeSettings(next);
      await chrome.storage.local.set({ settings });
      return settings;
    },
  });
})();
