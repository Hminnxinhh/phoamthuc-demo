// Runs before stylesheets so a saved dark preference does not flash a light UI.
// Appearance is separate from gameplay saves and never migrates or writes them.
(() => {
  const key = 'pho-am-thuc.theme';
  const device = window.matchMedia('(prefers-color-scheme: dark)');
  const modes = ['system', 'light', 'dark'];
  const listeners = new Set();
  const normalize = value => modes.includes(value) ? value : 'system';
  const read = () => { try { return normalize(localStorage.getItem(key)); } catch { return 'system'; } };
  let mode = read(), effective, volatile = false;
  function apply() {
    const next = mode === 'system' ? (device.matches ? 'dark' : 'light') : mode;
    const changed = document.documentElement.dataset.themeMode !== mode || next !== effective;
    effective = next;
    document.documentElement.dataset.theme = effective;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.style.colorScheme = effective;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', effective === 'dark' ? '#142a29' : '#f8f1e3');
    if (changed) for (const listener of listeners) listener();
  }
  const followDevice = () => { if (mode === 'system') apply(); };
  if (device.addEventListener) device.addEventListener('change', followDevice);
  else device.addListener(followDevice); // Older iOS Safari.
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { mode = read(); volatile = false; apply(); }
  });
  // Recheck after returning from device settings or restoring a suspended tab.
  for (const name of ['pageshow', 'focus']) window.addEventListener(name, () => { if (!volatile) mode = read(); apply(); });
  window.PhoTheme = Object.freeze({
    getMode: () => mode,
    getEffective: () => effective,
    setMode(value) {
      mode = normalize(value);
      try { localStorage.setItem(key, mode); volatile = false; } catch { volatile = true; /* Still usable for this visit. */ }
      apply();
    },
    subscribe(listener) { listeners.add(listener); listener(); return () => listeners.delete(listener); }
  });
  apply();
})();
