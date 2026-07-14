if (window.caches) {
  caches.keys().then(names => {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import CounterPage from './pages/CounterPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider } from './components/AuthProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Developer Easter Egg
const consoleStyle1 = "font-size: 18px; font-weight: bold; color: #0ea5e9; margin-bottom: 5px;";
const consoleStyle2 = "font-size: 13px; color: #475569; line-height: 1.6;";

console.info(
  "%c🤖 RAIM 방문객 관리 시스템%c\n\n앗! 개발자 도구를 열어보시다니, 기술에 관심이 많으신 분이군요! 👀✨\n여기는 서울로봇인공지능과학관(RAIM)의 방문객 현황을 실시간으로 관리하는 공간입니다.\n\n로봇과 AI가 일상에 스며드는 경험을 제공하기 위해 열심히 개발하고 있습니다.\n혹시라도 버그를 발견하셨거나 재미있는 아이디어가 있다면 언제든 알려주세요!\n\n오늘도 과학관에서 즐거운 시간 보내시길 바랍니다. 화이팅! 🚀",
  consoleStyle1,
  consoleStyle2
);

// Automatically check for updates
const updateSW = registerSW({
  onNeedRefresh() {
    // A prompt should ideally be shown here, but for now we just log
    console.log('New content available, please refresh.');
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<CounterPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </HashRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);


