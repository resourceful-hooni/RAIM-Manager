import { StrictMode, Suspense, lazy } from 'react';
import type { ComponentType, ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router';
import { Toaster, toast } from 'sonner';
import Layout from './components/Layout';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
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

function applyUpdateAndReload() {
  const reload = () => window.location.reload();
  // updateSW가 응답하지 않아도 새로고침은 반드시 진행한다
  const fallbackTimer = window.setTimeout(reload, 1200);
  Promise.resolve()
    .then(() => updateSW(true))
    .catch(() => undefined)
    .finally(() => {
      window.clearTimeout(fallbackTimer);
      reload();
    });
}

function promptRefresh() {
  if (isUpdatePromptOpen) return;
  isUpdatePromptOpen = true;
  toast('새 버전이 준비되었습니다.', {
    id: 'sw-update',
    description: '집계 중이라면 입력을 마친 뒤 새로고침해 주세요.',
    duration: Infinity,
    action: {
      label: '새로고침',
      onClick: applyUpdateAndReload,
    },
    classNames: {
      actionButton: 'min-h-11 px-4 font-bold',
    },
    onDismiss: () => {
      isUpdatePromptOpen = false;
    },
    onAutoClose: () => {
      isUpdatePromptOpen = false;
    },
  });
}

const updateSW = registerSW({
  // prompt 모드: 새 버전이 대기 상태가 되면 알리고, 직원이 새로고침을 누를 때 적용한다.
  // 그 전까지는 실행 중인 빌드의 청크가 프리캐시에 그대로 남는다.
  onNeedRefresh: promptRefresh,
  onOfflineReady() {
    console.log('App is ready to work offline');
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
