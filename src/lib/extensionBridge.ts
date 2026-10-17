/**
 * 크롬 확장(RAIM 예약현황 일괄 출력)에서 예약현황조회 엑셀을 넘겨받는 통로.
 *
 * 확장은 공공예약 관리자 화면에서 서비스별 엑셀을 받아 자기 메모리(chrome.storage.session)에 잠깐 맡아 둔다.
 * 확장이 출석부 주소(#/attendance?from=extension&t=…)로 탭을 옮기면 hashchange가 나고, 이 모듈이 확장에 직접 물어서 가져온다.
 * 화면이 열릴 때·창이 앞으로 올 때(focus·visibilitychange)도 한 번씩 확인한다.
 *
 * [보안]
 * - 통신은 chrome.runtime.sendMessage(확장 ID, …) 1:1 채널만 쓴다. window.postMessage처럼 창 전체에
 *   메시지를 뿌리지 않는다. (다만 이 사이트 접근 권한이 있는 다른 확장은 원래부터 페이지를 읽을 수 있다)
 * - 확장은 manifest의 externally_connectable에 적힌 이 사이트 주소, 그중에서도 확장이 직접 연 탭의
 *   출석부 화면에서 온 요청에만 파일을 넘긴다.
 * - 확장 ID는 manifest의 key로 고정돼 있다 (RAIM_EXTENSION_ID).
 *
 * [개인정보 보호]
 * 네트워크 요청·콘솔 출력·브라우저 저장소 사용이 없다. 받은 파일은 호출한 페이지에만 넘기고,
 * 확장으로 돌려보내는 결과에는 파일 식별자와 회차 수만 담는다 (이름·연락처 없음).
 */

export const BRIDGE_VERSION = 1;

/** extension/manifest.json의 key에서 나온 확장 ID (key를 바꾸면 이 값도 바꿔야 한다) */
export const RAIM_EXTENSION_ID = 'ohjbofjcjnkidgidaclhnppmcncnfbjf';

/** 한 번에 받는 파일 수와 파일 크기 상한 (예약현황조회 엑셀은 보통 수십 KB) */
const MAX_FILES = 50;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EXCEL_NAME = /\.(xlsx|xls)$/i;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const BATCH_ID = /^[0-9a-f-]{36}$/;

export interface ExtensionImportFile {
  /** 확장이 붙인 식별자 (서비스 ID + 이용일 범위) */
  id: string;
  /** 파일 이름 (서비스명·서비스 ID만 들어간다) */
  name: string;
  buffer: ArrayBuffer;
}

export interface ExtensionImportResult {
  id: string;
  /** 이 파일에서 읽어 낸 회차 수 (못 읽었으면 0) */
  sessions: number;
  ok: boolean;
}

type ImportHandler = (files: ExtensionImportFile[]) => Promise<ExtensionImportResult[]>;

interface ChromeRuntimeLike {
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void;
  lastError?: { message?: string };
}

/** 확장이 이 사이트를 externally_connectable로 열어 둔 경우에만 chrome.runtime이 보인다 */
const getRuntime = (): ChromeRuntimeLike | null => {
  const runtime = (window as unknown as { chrome?: { runtime?: ChromeRuntimeLike } }).chrome?.runtime;
  return runtime && typeof runtime.sendMessage === 'function' ? runtime : null;
};

const sendToExtension = (message: Record<string, unknown>): Promise<unknown> =>
  new Promise((resolve) => {
    const runtime = getRuntime();
    if (!runtime) {
      resolve(null);
      return;
    }
    try {
      runtime.sendMessage(RAIM_EXTENSION_ID, { version: BRIDGE_VERSION, ...message }, (response) => {
        // 확장이 없거나 꺼져 있으면 lastError가 생긴다. 읽어 두기만 하면 브라우저가 경고를 띄우지 않는다.
        void runtime.lastError;
        resolve(response ?? null);
      });
    } catch {
      resolve(null);
    }
  });

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
};

type ParsedPayload =
  | { kind: 'empty' }
  | { kind: 'invalid'; batchId: string }
  | { kind: 'files'; batchId: string; files: ExtensionImportFile[] };

/** 확장이 돌려준 응답을 검증한다. 형식이 하나라도 어긋나면 통째로 버린다. */
const parsePayload = (response: unknown): ParsedPayload => {
  if (!isPlainObject(response) || response.payload === null || response.payload === undefined) return { kind: 'empty' };
  const payload = response.payload;
  if (!isPlainObject(payload) || typeof payload.batchId !== 'string' || !BATCH_ID.test(payload.batchId)) {
    return { kind: 'empty' };
  }
  const batchId = payload.batchId;
  const invalid = { kind: 'invalid', batchId } as const;
  if (payload.version !== BRIDGE_VERSION) return invalid;
  const raw = payload.files;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_FILES) return invalid;

  const files: ExtensionImportFile[] = [];
  const seenNames = new Set<string>();
  for (const item of raw) {
    if (!isPlainObject(item)) return invalid;
    const { id, name, base64 } = item;
    if (typeof id !== 'string' || id.length === 0 || id.length > 200) return invalid;
    if (typeof name !== 'string' || name.length === 0 || name.length > 200 || !EXCEL_NAME.test(name)) return invalid;
    if (typeof base64 !== 'string' || base64.length === 0 || !BASE64.test(base64)) return invalid;
    if ((base64.length * 3) / 4 > MAX_FILE_BYTES) return invalid;
    // 결과를 파일 이름으로 짝지으므로 이름이 겹치면 받지 않는다
    if (seenNames.has(name)) return invalid;
    seenNames.add(name);
    try {
      files.push({ id, name, buffer: base64ToBuffer(base64) });
    } catch {
      return invalid;
    }
  }
  return { kind: 'files', batchId, files };
};

/**
 * 출석부 페이지가 열려 있는 동안 확장에 맡겨진 파일을 가져온다.
 * 페이지가 열릴 때, 확장이 주소를 바꿀 때(hashchange), 창이 앞으로 올 때, 탭이 다시 보일 때 확인한다.
 * 반환값을 호출하면 연결을 끊는다 (useEffect 정리 함수로 쓰면 된다).
 */
export const connectExtensionBridge = (handler: ImportHandler): (() => void) => {
  let busy = false;
  let again = false;
  let disposed = false;

  const claim = async () => {
    if (disposed || !getRuntime()) return;
    // 처리 중에 새 신호가 오면 버리지 않고, 끝난 뒤 한 번 더 확인한다
    if (busy) {
      again = true;
      return;
    }
    busy = true;
    try {
      const parsed = parsePayload(await sendToExtension({ type: 'CLAIM_IMPORT' }));
      if (parsed.kind === 'empty') return;
      if (parsed.kind === 'invalid') {
        await sendToExtension({ type: 'IMPORT_RESULT', batchId: parsed.batchId, results: [], error: 'invalid-payload' });
        return;
      }

      let results: ExtensionImportResult[] = [];
      let error: string | undefined;
      try {
        results = await handler(parsed.files);
      } catch {
        error = 'import-failed';
      }
      await sendToExtension({
        type: 'IMPORT_RESULT',
        batchId: parsed.batchId,
        results: results.map(({ id, sessions, ok }) => ({ id, sessions, ok })),
        error,
      });
    } finally {
      busy = false;
      if (again && !disposed) {
        again = false;
        void claim();
      }
    }
  };

  const onSignal = () => {
    void claim();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void claim();
  };

  window.addEventListener('hashchange', onSignal);
  window.addEventListener('focus', onSignal);
  document.addEventListener('visibilitychange', onVisibility);
  void claim();

  return () => {
    disposed = true;
    window.removeEventListener('hashchange', onSignal);
    window.removeEventListener('focus', onSignal);
    document.removeEventListener('visibilitychange', onVisibility);
  };
};
