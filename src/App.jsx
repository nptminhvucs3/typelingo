import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { settings, saveSettings } from './lib/store.js';
import * as cloud from './lib/sync.js';
import { buildWords } from './lib/words.js';
import { useStore } from './lib/hooks.js';
import { AppCtx } from './ctx.js';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Settings from './pages/Settings.jsx';
import Speak from './pages/Speak.jsx';
import Learn from './pages/Learn.jsx';
import ModeShell from './components/ModeShell.jsx';
import { modeById } from './modes.js';

const getRoute = () => (location.hash.replace(/^#\/?/, '') || 'home');

export default function App() {
  useStore();
  const [route, setRoute] = useState(getRoute());
  const [lang, setLangState] = useState(settings.lang);
  const [remote, setRemote] = useState(null);
  const [ver, setVer] = useState(0);
  const [theme, setTheme] = useState(settings.theme);
  const [authOpen, setAuthOpen] = useState(false);
  const refresh = useCallback(() => setVer(v => v + 1), []);

  useEffect(() => { const f = () => setRoute(getRoute()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    cloud.initAuth(() => { setTheme(settings.theme); setLangState(settings.lang); refresh(); });
    cloud.fetchRemoteWords().then(r => r && setRemote(r)).catch(() => {});
  }, [refresh]);

  const setLang = l => { settings.lang = l; saveSettings(); setLangState(l); };
  const toggleTheme = () => { settings.theme = theme === 'dark' ? 'light' : 'dark'; saveSettings(); setTheme(settings.theme); };
  const go = r => { location.hash = '/' + r; document.querySelector('.content')?.scrollTo(0, 0); };
  const all = useMemo(() => buildWords(lang, remote), [lang, remote, ver]); // eslint-disable-line

  const m = modeById(route);
  let page;
  if (route === 'settings') page = <Settings />;
  else if (route === 'speak') page = <Speak />;
  else if (route === 'learn') page = <Learn />;
  else if (m) page = <ModeShell key={m.id + lang} mode={m} />;
  else page = <Home />;

  return (
    <AppCtx.Provider value={{ lang, setLang, all, go, refresh, theme, toggleTheme, authOpen, setAuthOpen, route }}>
      <Layout>{page}</Layout>
    </AppCtx.Provider>
  );
}
