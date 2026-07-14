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


