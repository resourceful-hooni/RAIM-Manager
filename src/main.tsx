import { StrictMode, Suspense, lazy } from 'react';
import type { ComponentType, ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router';
import { Toaster, toast } from 'sonner';
import Layout from './components/Layout';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdateToast } from './components/UpdateToast';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

/* ------------------------------------------------------------------
 * 부팅 플레이스홀더
 * 첫 진입 시 React와 페이지 청크가 준비되기 전까지 빈 흰 화면이 보이던 문제를
 * 막는다. index.html은 다른 작업자가 관리하므로 진입 모듈에서 직접 그린다.
 * Tailwind가 아직 적용되지 않았을 수 있어 인라인 스타일만 사용한다.
 * ------------------------------------------------------------------ */
const BOOT_ID = 'raim-boot';

function showBootPlaceholder(container: HTMLElement) {
  if (container.childElementCount > 0) return;

  const style = document.createElement('style');
  style.id = `${BOOT_ID}-style`;
  style.textContent = `
    @keyframes raim-boot-pulse { 0%, 100% { opacity: .45 } 50% { opacity: .9 } }
    #${BOOT_ID} .raim-boot-block { animation: raim-boot-pulse 1.4s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      #${BOOT_ID} .raim-boot-block { animation: none; opacity: .6; }
    }
  `;
  document.head.appendChild(style);

  const boot = document.createElement('div');
  boot.id = BOOT_ID;
  boot.setAttribute('role', 'status');
  boot.setAttribute('aria-label', '화면을 불러오는 중입니다');
  boot.style.cssText = [
    'min-height:100dvh',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:1rem',
  ].join(';');

  const card = document.createElement('div');
  card.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'padding:2rem',
    'border-radius:1.5rem',
    'background:rgba(255,255,255,0.4)',
    'border:1px solid rgba(255,255,255,0.85)',
    'box-shadow:0 8px 32px rgba(0,0,0,0.06)',
    '-webkit-backdrop-filter:blur(20px)',
    'backdrop-filter:blur(20px)',
  ].join(';');

  const blockBase = [
    'background:rgba(255,255,255,0.65)',
    'border:1px solid rgba(255,255,255,0.85)',
  ].join(';');

  const circle = document.createElement('div');
  circle.className = 'raim-boot-block';
  circle.style.cssText = `${blockBase};width:3rem;height:3rem;border-radius:9999px;margin-bottom:1rem`;

  const bar = document.createElement('div');
  bar.className = 'raim-boot-block';
  bar.style.cssText = `${blockBase};width:6rem;height:1rem;border-radius:0.375rem`;

  card.appendChild(circle);
  card.appendChild(bar);
  boot.appendChild(card);
  container.appendChild(boot);
}

function clearBootPlaceholder() {
  const boot = document.getElementById(BOOT_ID);
  // React는 첫 커밋에서 #root를 비우므로 보통 boot는 이미 사라져 있다.
  // 아직 남아 있다면 다른 내용이 들어온 뒤에만 지워 빈 화면이 스치지 않게 한다.
  if (boot && (boot.parentElement?.childElementCount ?? 0) > 1) boot.remove();
  document.getElementById(`${BOOT_ID}-style`)?.remove();
}

const rootElement = document.getElementById('root')!;
showBootPlaceholder(rootElement);

/* ------------------------------------------------------------------
 * 서비스 워커 업데이트 안내
 * 예전에는 새 버전이 배포되면 곧바로 화면을 새로고침해, 집계 중이던 직원의
 * 입력이 끊길 수 있었다. 이제는 토스트로 알리고 새로고침 시점을 직원이 고른다.
 * ------------------------------------------------------------------ */
let isUpdatePromptOpen = false;
/** 이 탭에서 새로고침을 눌러 새 버전을 적용하는 중인지 */
let isApplyingUpdate = false;
let hasReloaded = false;
let swRegistration: ServiceWorkerRegistration | undefined;

/** 새 버전이 화면을 넘겨받지 못해도 이 시간이 지나면 새로고침한다 */
const UPDATE_APPLY_TIMEOUT_MS = 8000;

function reloadOnce() {
  if (hasReloaded) return;
  hasReloaded = true;
  window.location.reload();
}

function applyUpdateAndReload() {
  // 대기 중인 새 버전이 없으면(이미 적용됐거나 이전 빌드 청크만 사라진 경우) 바로 새로고침한다
  if (!swRegistration?.waiting || !('serviceWorker' in navigator)) {
    reloadOnce();
    return;
  }
  isApplyingUpdate = true;
  // 새 워커가 이 화면을 넘겨받은 뒤에 새로고침한다. 먼저 새로고침하면 이전 워커가 옛 화면을 내주고,
  // 그 사이 새 워커가 옛 파일을 캐시에서 지워 옛 스크립트를 못 받아 빈 화면이 된다.
  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });
  window.setTimeout(reloadOnce, UPDATE_APPLY_TIMEOUT_MS);
  Promise.resolve()
    .then(() => updateSW(true))
    .catch(reloadOnce);
}

function promptRefresh() {
  if (isUpdatePromptOpen) return;
  isUpdatePromptOpen = true;
  const closed = () => {
    isUpdatePromptOpen = false;
  };
  toast.custom(
    (id) => <UpdateToast onRefresh={applyUpdateAndReload} onLater={() => toast.dismiss(id)} />,
    { id: 'sw-update', duration: Infinity, dismissible: false, onDismiss: closed, onAutoClose: closed },
  );
}

/**
 * 새 버전 확인.
 * 브라우저는 페이지를 새로 열 때만 서비스 워커 업데이트를 확인하는데, 카운터·출석부 탭은
 * 하루 종일 열어 두므로 배포해도 안내가 뜨지 않았다. 몇 분마다, 그리고 탭으로 돌아올 때 확인한다.
 */
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_CHECK_MIN_GAP_MS = 60 * 1000;

function watchForUpdates(swUrl: string, registration: ServiceWorkerRegistration) {
  let lastCheck = 0;

  const check = async () => {
    // 안내를 닫았더라도 대기 중인 새 버전이 있으면 다시 알린다
    if (registration.waiting) {
      promptRefresh();
      return;
    }
    const now = Date.now();
    if (registration.installing || !navigator.onLine || now - lastCheck < UPDATE_CHECK_MIN_GAP_MS) return;
    lastCheck = now;
    try {
      // 서버가 응답할 때만 update()를 부른다 (오프라인이면 update()가 오래 매달린다)
      const response = await fetch(swUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
      if (response.status === 200) await registration.update();
    } catch {
      // 네트워크가 끊겼으면 다음 확인 때 다시 본다
    }
  };

  window.setInterval(() => void check(), UPDATE_CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
}

const updateSW = registerSW({
  // prompt 모드: 새 버전이 대기 상태가 되면 알리고, 직원이 새로고침을 누를 때 적용한다.
  // 그 전까지는 실행 중인 빌드의 청크가 프리캐시에 그대로 남는다.
  onNeedRefresh: promptRefresh,
  // 새 버전이 화면을 넘겨받았을 때. 다른 탭에서 새로고침을 눌렀다면 이 탭은 집계 중일 수 있으니
  // 바로 새로고침하지 않고 안내만 띄운다.
  onNeedReload() {
    if (isApplyingUpdate) reloadOnce();
    else promptRefresh();
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
  onRegisteredSW(swUrl, registration) {
    swRegistration = registration;
    if (registration) watchForUpdates(swUrl, registration);
  },
});

/* ------------------------------------------------------------------
 * 페이지 코드 분할
 * 다섯 페이지를 모두 정적으로 불러오면 recharts·jspdf·exceljs까지 첫 화면에서
 * 내려받게 된다. 라우트별로 나눠 필요한 순간에만 가져온다.
 * ------------------------------------------------------------------ */
type PageModule = { default: ComponentType<any> };

function lazyPage(load: () => Promise<PageModule>) {
  return lazy(async () => {
    try {
      return await load();
    } catch {
      // 새 버전이 배포되면 이전 빌드의 청크가 사라져 실패할 수 있다.
      // 한 번 더 시도하고, 그래도 실패하면 새로고침을 안내한 뒤 오류 경계로 넘긴다.
      try {
        return await load();
      } catch {
        // 여기까지 왔으면 이전 빌드의 청크가 서버에서 사라진 경우다.
        // 오류 경계로 던지면 카운터까지 통째로 내려가므로, 집계는 이미 Firestore에
        // 기록돼 있는 만큼 새 빌드로 새로고침해 스스로 복구한다.
        applyUpdateAndReload();
        // 새로고침이 진행되는 동안 화면을 그대로 두기 위해 영원히 대기한다
        return await new Promise<PageModule>(() => {});
      }
    }
  });
}

const CounterPage = lazyPage(() => import('./pages/CounterPage'));
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'));
const HistoryPage = lazyPage(() => import('./pages/HistoryPage'));
const AttendancePage = lazyPage(() => import('./pages/AttendancePage'));
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'));

/** 페이지 청크를 기다리는 동안 보여주는 골격. 앱의 프로스티드 카드 형태를 그대로 따른다. */
function PageSkeleton() {
  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-xl mx-auto" role="status">
      <span className="sr-only">화면을 불러오는 중입니다</span>
      <div
        aria-hidden="true"
        className="bg-white/40 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-4 animate-pulse"
      >
        <div className="h-4 w-28 rounded-full bg-white/70 border border-white/80" />
        <div className="h-24 rounded-2xl bg-white/60 border border-white/70" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-14 rounded-2xl bg-white/60 border border-white/70" />
          <div className="h-14 rounded-2xl bg-white/60 border border-white/70" />
          <div className="h-14 rounded-2xl bg-white/60 border border-white/70" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="bg-white/40 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-3 animate-pulse"
      >
        <div className="h-4 w-20 rounded-full bg-white/70 border border-white/80" />
        <div className="h-10 rounded-xl bg-white/60 border border-white/70" />
        <div className="h-10 rounded-xl bg-white/60 border border-white/70" />
      </div>
    </div>
  );
}

function withSkeleton(page: ReactElement) {
  return <Suspense fallback={<PageSkeleton />}>{page}</Suspense>;
}

// Developer Easter Egg
const consoleStyle1 = "font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 5px;";
const consoleStyle2 = "font-size: 13px; color: #475569; line-height: 1.6;";

console.info(
  "%c🤖 RAIM 방문객 관리 시스템%c\n\n앗! 개발자 도구를 열어보시다니, 기술에 관심이 많으신 분이군요! 👀✨\n여기는 서울로봇인공지능과학관(RAIM)의 방문객 현황을 실시간으로 관리하는 공간입니다.\n\n로봇과 AI가 일상에 스며드는 경험을 제공하기 위해 열심히 개발하고 있습니다.\n혹시라도 버그를 발견하셨거나 재미있는 아이디어가 있다면 언제든 알려주세요!\n\n오늘도 과학관에서 즐거운 시간 보내시길 바랍니다. 화이팅! 🚀",
  consoleStyle1,
  consoleStyle2
);

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={withSkeleton(<CounterPage />)} />
              <Route path="dashboard" element={withSkeleton(<DashboardPage />)} />
              <Route path="history" element={withSkeleton(<HistoryPage />)} />
              <Route path="attendance" element={withSkeleton(<AttendancePage />)} />
              <Route path="settings" element={withSkeleton(<SettingsPage />)} />
            </Route>
          </Routes>
        </HashRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// 첫 커밋이 끝난 다음 프레임에 부팅 플레이스홀더 잔여물을 정리한다.
requestAnimationFrame(() => requestAnimationFrame(clearBootPlaceholder));
