'use strict';

(async () => {
  const EXT = globalThis.RAIM_EXT;
  const reason = document.getElementById('reason');
  const gap = document.getElementById('gap');
  const status = document.getElementById('status');

  EXT.REASONS.forEach(({ code, text }) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = text;
    reason.appendChild(option);
  });

  const render = (settings) => {
    reason.value = settings.reasonCode;
    gap.value = String(settings.gapMs);
  };

  render(await EXT.loadSettings());

  document.getElementById('save').addEventListener('click', async () => {
    const saved = await EXT.saveSettings({ reasonCode: reason.value, gapMs: gap.value });
    render(saved);
    status.textContent = '저장했습니다.';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
})();
