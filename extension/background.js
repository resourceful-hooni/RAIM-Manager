'use strict';

/**
 * 백그라운드 서비스 워커.
 *
 * - 공공예약 화면이 받은 엑셀을 chrome.storage.session(메모리, 디스크에 남지 않음)에 잠깐 맡아 두고
 *   RAIM Manager 출석부 탭을 열거나 앞으로 가져온다.
 * - 파일은 "확장이 연 그 탭"의 출석부 화면이 externally_connectable 1:1 채널로 요청할 때만 넘기고, 즉시 지운다.
 *   (window.postMessage로 창 전체에 뿌리지 않는다. 다만 RAIM 사이트 접근 권한이 있는 다른 확장은
 *    이 확장과 상관없이 그 페이지 자체를 읽을 수 있으므로, 업무용 크롬에는 필요한 확장만 둔다.)
 * - 한 번만 넘기고, 5분이 지나면 알람으로 지운다.
 * - 출석부 화면이 돌려준 결과(묶음 ID·파일 식별자·회차 수)를 그 묶음을 보낸 공공예약 탭으로만 전달한다.
 *
 * 이 워커는 네트워크 요청을 하지 않는다. 예약자 정보는 console에 찍지 않고 chrome.storage.local에도 넣지 않는다.
 */
importScripts('shared.js');

const EXT = globalThis.RAIM_EXT;
const PENDING_KEY = 'pendingImport';
const ROUTES_KEY = 'importRoutes';
const PURGE_ALARM = 'raim-purge-pending';
/** 결과를 돌려보낼 공공예약 탭 정보를 얼마나 기억할지 (개인정보 없음) */
const ROUTE_TTL_MS = 30 * 60 * 1000;
const MAX_ROUTES = 5;

const originOf = (sender) => {
  if (sender.origin) return sender.origin;
  try {
    return new URL(sender.url || '').origin;
  } catch {
    return '';
  }
};

/** 우리 확장의 공공예약 콘텐츠 스크립트(최상위 프레임)에서 온 메시지인지 */
const isYeyakSender = (sender) =>
  sender.id === chrome.runtime.id &&
  originOf(sender) === EXT.YEYAK_ORIGIN &&
  Boolean(sender.tab) &&
  (sender.frameId === undefined || sender.frameId === 0);

/** RAIM Manager 페이지(최상위 프레임)에서 온 메시지인지 */
const isRaimSender = (sender) =>
  originOf(sender) === EXT.RAIM_ORIGIN && Boolean(sender.tab) && (sender.frameId === undefined || sender.frameId === 0);

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const FILE_NAME = /^[^\\/:*?"<>|]{1,200}\.xlsx$/;
const BATCH_ID = /^[0-9a-f-]{36}$/;

/** 공공예약 화면이 보낸 파일 목록 검증 */
const validateFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0 || files.length > EXT.LIMITS.maxServices) return false;
  let total = 0;
  const names = new Set();
  for (const file of files) {
    if (!file || typeof file.name !== 'string' || !FILE_NAME.test(file.name) || names.has(file.name)) return false;
    if (typeof file.id !== 'string' || file.id.length === 0 || file.id.length > 200) return false;
    if (typeof file.base64 !== 'string' || file.base64.length === 0 || !BASE64.test(file.base64)) return false;
    names.add(file.name);
    total += Math.floor((file.base64.length * 3) / 4);
  }
  return total <= EXT.LIMITS.maxTotalBytes;
};

/**
 * 출석부 주소. 끝의 t 값은 매번 달라지는 숫자(개인정보 아님)로, 이미 출석부 화면이 떠 있어도
 * hashchange 이벤트가 나서 화면이 곧바로 파일을 가져가게 한다.
 */
const attendanceUrl = (base = `${EXT.RAIM_ORIGIN}/`) => `${base}#/attendance?from=extension&t=${Date.now()}`;

/** 파일을 넘길 RAIM 탭을 정한다 (아직 그 탭을 출석부로 옮기지는 않는다) */
const pickAttendanceTab = async () => {
  const tabs = await chrome.tabs.query({ url: `${EXT.RAIM_ORIGIN}/*` });
  const existing = tabs.find((tab) => (tab.url || '').includes('#/attendance')) || tabs[0];
  if (existing) return { tabId: existing.id, windowId: existing.windowId, base: (existing.url || '').split('#')[0] };
  // 새 탭은 빈 화면으로 먼저 만들고, 파일을 맡긴 뒤에 출석부 주소로 옮긴다 (먼저 떠서 빈손으로 돌아가지 않게)
  const created = await chrome.tabs.create({ url: 'about:blank', active: true });
  return { tabId: created.id, windowId: created.windowId, base: `${EXT.RAIM_ORIGIN}/` };
};

/** 만료된 대기 파일과 오래된 결과 경로를 지운다 */
const purgeExpired = async () => {
  const stored = await chrome.storage.session.get([PENDING_KEY, ROUTES_KEY]);
  const now = Date.now();
  if (stored[PENDING_KEY] && !(stored[PENDING_KEY].expiresAt >= now)) {
    await chrome.storage.session.remove(PENDING_KEY);
  }
  const routes = Array.isArray(stored[ROUTES_KEY]) ? stored[ROUTES_KEY] : [];
  const alive = routes.filter((route) => route && route.expiresAt >= now);
  if (alive.length !== routes.length) await chrome.storage.session.set({ [ROUTES_KEY]: alive });
};

const stageImport = async (message, sender) => {
  const payload = message && message.payload;
  if (
    !payload ||
    payload.version !== EXT.BRIDGE_VERSION ||
    typeof payload.batchId !== 'string' ||
    !BATCH_ID.test(payload.batchId) ||
    !validateFiles(payload.files)
  ) {
    return { ok: false, error: '넘길 파일 형식이 올바르지 않습니다.' };
  }

  let target;
  try {
    target = await pickAttendanceTab();
  } catch {
    return { ok: false, error: 'RAIM Manager 탭을 열지 못했습니다.' };
  }

  const now = Date.now();
  const expiresAt = now + EXT.LIMITS.pendingTtlMs;
  const stored = await chrome.storage.session.get(ROUTES_KEY);
  const routes = (Array.isArray(stored[ROUTES_KEY]) ? stored[ROUTES_KEY] : [])
    .filter((route) => route && route.expiresAt >= now)
    .slice(-(MAX_ROUTES - 1));
  routes.push({ batchId: payload.batchId, sourceTabId: sender.tab.id, targetTabId: target.tabId, expiresAt: now + ROUTE_TTL_MS });

  // 새 묶음은 이전 대기 묶음을 대신한다 (한 번에 하나만 맡아 둔다)
  await chrome.storage.session.set({
    [PENDING_KEY]: {
      batchId: payload.batchId,
      targetTabId: target.tabId,
      expiresAt,
      files: payload.files.map(({ id, name, base64 }) => ({ id, name, base64 })),
    },
    [ROUTES_KEY]: routes,
  });
  await chrome.alarms.create(PURGE_ALARM, { when: expiresAt + 1000 });

  try {
    // 같은 앱 안에서 해시만 바뀌므로 새로고침 없이 출석부 화면으로 넘어간다
    await chrome.tabs.update(target.tabId, { url: attendanceUrl(target.base), active: true });
    await chrome.windows.update(target.windowId, { focused: true });
  } catch {
    return { ok: false, error: 'RAIM Manager 탭을 열지 못했습니다.' };
  }
  return { ok: true };
};

/** 출석부 화면이 focus·visibilitychange·hashchange로 거의 동시에 여러 번 요청해도 한 번만 넘기도록 줄을 세운다 */
let claimQueue = Promise.resolve();
const claimImport = (sender) => {
  const next = claimQueue.then(
    () => takePending(sender),
    () => takePending(sender),
  );
  claimQueue = next.catch(() => {});
  return next;
};

const takePending = async (sender) => {
  const stored = await chrome.storage.session.get(PENDING_KEY);
  const pending = stored[PENDING_KEY];
  if (!pending) return { payload: null };
  if (!(pending.expiresAt >= Date.now())) {
    await chrome.storage.session.remove(PENDING_KEY);
    return { payload: null };
  }
  // 확장이 연 그 탭의 출석부 화면만 가져갈 수 있다 (다른 RAIM 탭·다른 화면은 거절하고 파일은 그대로 둔다)
  if (sender.tab.id !== pending.targetTabId || !(sender.url || '').includes('#/attendance')) {
    return { payload: null };
  }
  // 한 번만 넘긴다: 꺼내는 즉시 지운다
  await chrome.storage.session.remove(PENDING_KEY);
  return { payload: { version: EXT.BRIDGE_VERSION, batchId: pending.batchId, files: pending.files } };
};

const relayResult = async (message, sender) => {
  if (typeof message.batchId !== 'string' || !BATCH_ID.test(message.batchId)) return;
  const stored = await chrome.storage.session.get(ROUTES_KEY);
  const routes = Array.isArray(stored[ROUTES_KEY]) ? stored[ROUTES_KEY] : [];
  const route = routes.find((item) => item && item.batchId === message.batchId && item.expiresAt >= Date.now());
  // 그 묶음을 받은 탭이 보낸 결과만, 그 묶음을 보낸 공공예약 탭으로만 전달한다
  if (!route || route.targetTabId !== sender.tab.id) return;

  // 결과에는 파일 식별자와 회차 수만 담아 넘긴다
  const results = Array.isArray(message.results)
    ? message.results
        .filter((item) => item && typeof item.id === 'string' && item.id.length <= 200)
        .slice(0, EXT.LIMITS.maxServices)
        .map((item) => ({ id: item.id, sessions: Number(item.sessions) || 0, ok: item.ok === true }))
    : [];
  const error = typeof message.error === 'string' ? message.error.slice(0, 50) : undefined;
  await chrome.tabs
    .sendMessage(route.sourceTabId, { type: 'IMPORT_RESULT', batchId: route.batchId, results, error })
    .catch(() => {});
};

const respond = (task, sendResponse) => {
  task.then(sendResponse, () => sendResponse({ ok: false, error: '처리 중 오류가 발생했습니다.' }));
  return true;
};

// 우리 확장 안(공공예약 콘텐츠 스크립트)에서 오는 메시지
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'STAGE_IMPORT' && isYeyakSender(sender)) {
    return respond(stageImport(message, sender), sendResponse);
  }
  return false;
});

// RAIM Manager 페이지에서 오는 메시지 (manifest의 externally_connectable에 적힌 주소만 보낼 수 있다)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isRaimSender(sender) || !message || message.version !== EXT.BRIDGE_VERSION) return false;
  if (message.type === 'CLAIM_IMPORT') return respond(claimImport(sender), sendResponse);
  if (message.type === 'IMPORT_RESULT') {
    return respond(relayResult(message, sender).then(() => ({ ok: true })), sendResponse);
  }
  return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PURGE_ALARM) purgeExpired().catch(() => {});
});

// 툴바 아이콘을 누르면 설정 화면을 연다
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

// 설치·업데이트 때 남아 있을지 모르는 대기 파일을 지운다
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.remove([PENDING_KEY, ROUTES_KEY]).catch(() => {});
});

// 워커가 다시 깨어날 때마다 만료된 것을 정리한다
purgeExpired().catch(() => {});
