'use client';

import { useMemo, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent } from 'react';
import { defaultFollowing, entityById } from '@/data/entities';
import { DEFAULT_SCORE_ROUTE, parseScoreRoute } from '@/lib/navigation';
import { parsePreferences, STORAGE_KEY, type Preferences } from '@/lib/preferences';
import { reorderFollowing } from '@/lib/scores';
import { Search, Following } from './Discovery';
import { EventDetail } from './EventDetail';
import { BrandMark, Icon, type IconName } from './Icon';
import { FollowRail, Scoreboard } from './Scoreboard';

let memoryPreferences: string | null = null;
function readPreferences() {
  try { return memoryPreferences ?? window.localStorage.getItem(STORAGE_KEY); } catch { return memoryPreferences; }
}
function subscribePreferences(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) { memoryPreferences = event.newValue; callback(); }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('slate-preferences', callback);
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('slate-preferences', callback); };
}
const scrollPositions = new Map<string, number>();
function subscribeRoute(callback: () => void) {
  let previous = window.location.hash.slice(1) || DEFAULT_SCORE_ROUTE;
  const previousScrollRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = 'manual';
  const onRoute = () => {
    scrollPositions.set(previous, window.scrollY);
    previous = window.location.hash.slice(1) || DEFAULT_SCORE_ROUTE;
    callback();
    window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
      window.scrollTo({ top: scrollPositions.get(previous) ?? 0, behavior: 'instant' });
    });
  };
  window.addEventListener('hashchange', onRoute);
  return () => {
    window.removeEventListener('hashchange', onRoute);
    window.history.scrollRestoration = previousScrollRestoration;
  };
}
const noopSubscribe = () => () => {};
const nav: { id: string; label: string; icon: IconName }[] = [
  { id: 'scores', label: 'Scores', icon: 'scores' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'following', label: 'Following', icon: 'following' },
];

export function SlateApp() {
  const route = useSyncExternalStore(subscribeRoute, () => window.location.hash.slice(1) || DEFAULT_SCORE_ROUTE, () => DEFAULT_SCORE_ROUTE);
  const raw = useSyncExternalStore(subscribePreferences, readPreferences, () => null);
  const preferences = useMemo(() => parsePreferences(raw), [raw]);
  const timeZone = useSyncExternalStore(noopSubscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => 'America/New_York');
  const [notice, setNotice] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [lastScores, setLastScores] = useState(DEFAULT_SCORE_ROUTE);
  const [path, query] = route.split('?');
  const [, requestedView = 'scores', id = 'for-you'] = path.split('/');
  const view = ['scores', 'search', 'following', 'event'].includes(requestedView) ? requestedView : 'scores';
  const scoreRoute = parseScoreRoute(view === 'scores' ? path : undefined) ?? parseScoreRoute(DEFAULT_SCORE_ROUTE)!;
  const { day, destination } = scoreRoute;
  const activeNav = view === 'event' ? 'scores' : view;
  const fromQuery = new URLSearchParams(query).get('from');
  const from = parseScoreRoute(fromQuery)?.path ?? lastScores;

  const save = (next: Preferences) => {
    memoryPreferences = JSON.stringify(next);
    try { window.localStorage.setItem(STORAGE_KEY, memoryPreferences); } catch { setStorageWarning(true); }
    window.dispatchEvent(new Event('slate-preferences'));
  };
  const toggleFollow = (target: string) => {
    const follows = preferences.following.includes(target);
    save({ ...preferences, following: follows ? preferences.following.filter(item => item !== target) : [...preferences.following, target] });
    setNotice(`${entityById[target].name} ${follows ? 'unfollowed' : 'added to your scores'}.`);
  };
  const move = (target: string, direction: -1 | 1) => {
    const following = reorderFollowing(preferences.following, target, direction);
    save({ ...preferences, following });
    setNotice(`${entityById[target].shortName} moved ${direction === -1 ? 'up' : 'down'} to position ${following.indexOf(target) + 1}.`);
  };
  const toggleTheme = () => {
    const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    save({ ...preferences, theme: dark ? 'light' : 'dark' });
  };
  const currentScores = view === 'scores' ? scoreRoute.path : view === 'event' ? from : lastScores;
  const rememberScoreTarget = (event: ReactMouseEvent<HTMLDivElement>) => {
    const href = (event.target as Element).closest('a')?.getAttribute('href');
    const target = parseScoreRoute(href?.startsWith('#') ? href.slice(1) : href);
    if (target) setLastScores(target.path);
  };
  const navItems = nav.map(item => <a href={`#${item.id === 'scores' ? currentScores : `/${item.id}`}`} onClick={() => setLastScores(currentScores)} key={item.id} className={activeNav === item.id ? 'active' : ''} aria-current={activeNav === item.id ? 'page' : undefined}><Icon name={item.icon} size={21}/><span>{item.label}</span></a>);

  return <div className="slate-app" data-theme={preferences.theme} onClickCapture={rememberScoreTarget}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <header className="app-header"><div className="header-inner"><a className="brand" href="#/scores/for-you/today" aria-label="Slate, For You scores"><BrandMark/><span>slate</span></a><nav className="desktop-nav" aria-label="Main navigation">{navItems}</nav><div className="header-actions"><span className="demo-badge">Mock data</span><button className="icon-button theme-toggle" aria-label="Toggle light and dark theme" onClick={toggleTheme}><span className="theme-sun"><Icon name="sun"/></span><span className="theme-moon"><Icon name="moon"/></span></button></div></div></header>
    {view === 'scores' && <div className="rail-container"><FollowRail following={preferences.following} destination={destination} day={day}/></div>}
    <main id="main-content" className={`main-content ${view === 'event' ? 'event-page' : ''}`} tabIndex={-1}>
      {storageWarning && <p className="storage-warning" role="status"><strong>Storage unavailable.</strong> Your changes will only last for this visit — avoid closing this tab if you want to keep them.</p>}
      {view === 'search' ? <Search following={preferences.following} onToggle={toggleFollow}/>
      : view === 'following' ? <Following following={preferences.following} onToggle={toggleFollow} onMove={move} onReset={() => { save({ ...preferences, following: defaultFollowing }); setNotice('Starter follows restored.'); }}/>
      : view === 'event' ? <EventDetail id={id} from={from} timeZone={timeZone}/>
      : <Scoreboard key={destination} destination={destination} day={day} following={preferences.following} timeZone={timeZone} onToggleFollow={toggleFollow}/>}
      <footer className="prototype-footer"><BrandMark/><span>Phase 0 · Fictionalized September 2026 slate</span></footer>
    </main>
    <div className="sr-only" role="status" aria-live="polite">{notice}</div>
    <nav className="mobile-nav" aria-label="Main navigation">{navItems}</nav>
  </div>;
}
