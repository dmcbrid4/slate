export type IconName = 'scores' | 'search' | 'following' | 'chevron' | 'back' | 'plus' | 'check' | 'up' | 'down' | 'sun' | 'moon' | 'close' | 'ball' | 'arrow' | 'grip';
const paths: Record<IconName, React.ReactNode> = {
  scores: <><path d="M4 5h16v14H4zM4 9h16M9 9v10M15 9v10" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
  following: <><path d="M8 5h12M8 12h12M8 19h12"/><circle cx="3" cy="5" r=".5"/><circle cx="3" cy="12" r=".5"/><circle cx="3" cy="19" r=".5"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  back: <path d="m14 5-7 7 7 7M7 12h14"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  up: <path d="m6 14 6-6 6 6"/>,
  down: <path d="m6 10 6 6 6-6"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/></>,
  moon: <path d="M20 14.3A8.5 8.5 0 0 1 9.7 4 8.5 8.5 0 1 0 20 14.3Z"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  ball: <><circle cx="12" cy="12" r="8.5"/><path d="M5.5 6.5c5 1 7 5 5 13M18.5 17.5c-5-1-7-5-5-13"/></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  grip: <><path d="M8 6h.01M16 6h.01M8 12h.01M16 12h.01M8 18h.01M16 18h.01" strokeWidth="3"/></>,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function BrandMark() {
  return <svg width="27" height="27" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true"><path d="M7 4h19l-4 5H3zm0 8h15l-4 5H3zm0 8h11l-4 5H3z"/></svg>;
}
