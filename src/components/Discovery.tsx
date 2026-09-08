import { useState } from 'react';
import { entities, entityById } from '@/data/entities';
import { Icon } from './Icon';
import { Mark } from './ScoreCard';

export function Search({ following, onToggle }: { following: string[]; onToggle: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase();
  const results = entities.filter(entity => `${entity.name} ${entity.shortName} ${entity.subtitle} ${entity.kind}`.toLocaleLowerCase().includes(normalized));
  return <>
    <div className="page-heading"><div><p className="eyebrow">Make it yours</p><h1>Search</h1></div></div>
    <div className="search-input"><Icon name="search"/><input autoFocus type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Teams, players, competitions…" aria-label="Search teams, players, and competitions"/>{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" size={18}/></button>}</div>
    <div className="section-heading"><h2>{normalized ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Explore Slate'}</h2><span className="secondary">All sports</span></div>
    <div className="entity-list">{results.map(entity => <div className="entity-row" key={entity.id}><Mark {...entity}/><a className="entity-info" href={`#/scores/${entity.id}/today`}><strong>{entity.name}</strong><span>{entity.kind} · {entity.subtitle}</span></a><button className={`follow-button ${following.includes(entity.id) ? 'is-following' : ''}`} aria-label={`${following.includes(entity.id) ? 'Unfollow' : 'Follow'} ${entity.name}`} aria-pressed={following.includes(entity.id)} onClick={() => onToggle(entity.id)}><Icon name={following.includes(entity.id) ? 'check' : 'plus'} size={16}/><span>{following.includes(entity.id) ? 'Following' : 'Follow'}</span></button></div>)}</div>
    {!results.length && <div className="empty-state"><Icon name="search" size={28}/><h2>No matches for “{query}”</h2><p>Try a team, player, or competition, like Tottenham or Alcaraz.</p><button className="button-primary" onClick={() => setQuery('')}>Explore all entities</button></div>}
    <p className="small-note">Search covers the curated Phase 0 mock collection.</p>
  </>;
}

// Moving or removing a row can disable/unmount the button that triggered it, which drops
// focus to <body>. Redirect focus to a sensible surviving control instead.
function focusAfterRowAction(list: HTMLElement, row: HTMLElement | null, rowIndex: number) {
  const active = document.activeElement;
  const healthy = active && active !== document.body && document.body.contains(active) && !(active instanceof HTMLButtonElement && active.disabled);
  if (healthy) return;
  if (row && list.contains(row)) {
    row.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    return;
  }
  const rows = Array.from(list.querySelectorAll<HTMLElement>('.entity-row:not(.pinned-row)'));
  const fallbackRow = rows[rowIndex] ?? rows[rowIndex - 1];
  const focusable = fallbackRow?.querySelector<HTMLElement>('button:not(:disabled), a');
  (focusable ?? document.querySelector<HTMLElement>('.add-follow-row'))?.focus();
}

function handleRowAction(event: { currentTarget: HTMLElement }, action: () => void) {
  const row = event.currentTarget.closest<HTMLElement>('.entity-row');
  const list = row?.closest<HTMLElement>('.entity-list') ?? null;
  const rows = list ? Array.from(list.querySelectorAll<HTMLElement>('.entity-row:not(.pinned-row)')) : [];
  const rowIndex = row ? rows.indexOf(row) : -1;
  action();
  if (list) requestAnimationFrame(() => focusAfterRowAction(list, row, rowIndex));
}

export function Following({ following, onToggle, onMove, onReset }: { following: string[]; onToggle: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void; onReset: () => void }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">Your scoreboard, in your order</p><h1>Following <span className="heading-count">{following.length}</span></h1></div><a className="icon-button" href="#/search" aria-label="Add a follow"><Icon name="plus"/></a></div>
    <p className="intro-text">Use the arrows to arrange your followed scoreboards.</p>
    <div className="entity-list following-list"><div className="entity-row pinned-row"><span className="entity-mark neutral"><Icon name="scores"/></span><div className="entity-info"><strong>For You</strong><span>Everything you follow, without duplicates.</span></div><span className="pinned-label">Pinned</span></div>
      {following.map((id, index) => {
        const entity = entityById[id];
        return <div className="entity-row" key={id}><Mark {...entity}/><a className="entity-info" href={`#/scores/${id}/today`}><strong>{entity.shortName}</strong><span>{entity.kind} · {entity.subtitle.split(' · ')[0]}</span></a><div className="reorder-controls"><button className="icon-button" disabled={index === 0} aria-label={`Move ${entity.shortName} up`} onClick={event => handleRowAction(event, () => onMove(id, -1))}><Icon name="up" size={18}/></button><button className="icon-button" disabled={index === following.length - 1} aria-label={`Move ${entity.shortName} down`} onClick={event => handleRowAction(event, () => onMove(id, 1))}><Icon name="down" size={18}/></button><button className="icon-button remove-follow" aria-label={`Unfollow ${entity.name}`} onClick={event => handleRowAction(event, () => onToggle(id))}><Icon name="close" size={17}/></button></div></div>;
      })}
    </div>
    {!following.length && <p className="intro-text">No follows yet. Add your first team, tour, or competition below.</p>}
    <a className="add-follow-row" href="#/search"><Icon name="plus" size={20}/>Find something to follow<Icon name="chevron" size={17}/></a>
    <div className="following-footer"><span>Saved on this device</span><button onClick={onReset}>Restore starter follows</button></div>
  </>;
}
