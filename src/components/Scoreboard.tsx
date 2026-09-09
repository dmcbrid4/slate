import { useEffect, useRef, useState } from 'react';
import { entities, entityById } from '@/data/entities';
import { eventMatchesFollowDestination, groupByRoundInOrder, isPersonal, selectScoreboardEvents } from '@/data/scoreboard';
import type { Day } from '@/data/types';
import { days, formatDay, formatFullDay, selectedDate, swipeDestination, timezoneLabel } from '@/lib/scores';
import type { ScoreboardEvent } from '@/read-models/scoreboard';
import type { ScoreboardData } from '@/read-models/scoreboard-data';
import { Icon } from './Icon';
import { Mark, ScoreCard } from './ScoreCard';

export function DateNav({ day, destination, timeZone, asOf }: { day: Day; destination: string; timeZone: string; asOf: string }) {
  return <nav className="date-nav" aria-label="Scoreboard date">{days.map(item => {
    const date = selectedDate(asOf, item, timeZone);
    const label = item[0].toUpperCase() + item.slice(1);
    const classes = [day === item ? 'selected' : '', item === 'today' ? 'calendar-today' : ''].filter(Boolean).join(' ');
    return <a href={`#/scores/${destination}/${item}`} className={classes} aria-label={`${label}, ${formatFullDay(date)}`} aria-current={day === item ? 'date' : undefined} key={item}>
      <span>{label}</span><time dateTime={date}>{formatDay(date).split(', ')[1]}</time>
    </a>;
  })}</nav>;
}

export function EventGroup({ title, subtitle, events, timeZone, from, tournament = false, showVenue = false }: { title: string; subtitle?: string; events: readonly ScoreboardEvent[]; timeZone: string; from: string; tournament?: boolean; showVenue?: boolean }) {
  if (!events.length) return null;
  return <section className="event-group">
    <div className="section-heading"><h2>{title}{subtitle && <span>{subtitle}</span>}</h2>{tournament && <a href={`#/scores/us-open/${from.split('/').at(-1)}`} className="quiet-link">Tournament <Icon name="chevron" size={14}/></a>}</div>
    <div className="event-grid">{events.map(event => <ScoreCard key={event.id} event={event} timeZone={timeZone} from={from} showVenue={showVenue}/>)}</div>
  </section>;
}

export function Scoreboard({ data, destination, day, following, timeZone, onToggleFollow }: { data: ScoreboardData; destination: string; day: Day; following: string[]; timeZone: string; onToggleFollow: (id: string) => void }) {
  const [category, setCategory] = useState('All');
  const touch = useRef<{ x: number; y: number } | null>(null);
  const from = `/scores/${destination}/${day}`;
  const events = selectScoreboardEvents(data, destination, following, day, timeZone);
  const personal = events.filter(isPersonal);
  const rest = events.filter(event => !isPersonal(event));
  const usedRest = new Set<string>();
  const broadGroups = following
    .map(id => entityById[id])
    .filter(candidate => candidate && candidate.kind !== 'Team' && candidate.kind !== 'Player')
    .map(broad => {
      const groupEvents = rest.filter(event => !usedRest.has(event.id) && eventMatchesFollowDestination(event, broad.id));
      groupEvents.forEach(event => usedRest.add(event.id));
      return { broad, groupEvents };
    })
    .filter(group => group.groupEvents.length > 0);
  const entity = entityById[destination];
  const tennis = entity?.sport === 'tennis';
  const tournament = destination === 'us-open';
  const activeDate = selectedDate(data.asOf, day, timeZone);
  const visible = events.filter(event => category === 'All' || event.sport !== 'tennis' || event.category === category);
  const liveCount = events.filter(event => event.status === 'live').length;
  const startSwipe = (x: number, y: number, touchCount: number) => {
    touch.current = touchCount === 1 ? { x, y } : null;
  };
  const swipe = (endX: number, endY: number) => {
    if (!touch.current) return false;
    const dx = endX - touch.current.x;
    const dy = endY - touch.current.y;
    touch.current = null;
    const next = swipeDestination(destination, following, dx, dy);
    if (next) window.location.hash = `/scores/${next}/${day}`;
    return Boolean(next);
  };

  return <div
    className="scoreboard-view"
    onTouchStart={event => {
      const first = event.touches[0];
      startSwipe(first?.clientX ?? 0, first?.clientY ?? 0, event.touches.length);
    }}
    onTouchMove={event => {
      if (event.touches.length !== 1) touch.current = null;
    }}
    onTouchEnd={event => {
      const last = event.changedTouches[0];
      if (last && swipe(last.clientX, last.clientY)) event.preventDefault();
    }}
    onTouchCancel={() => { touch.current = null; }}
  >
    <div className="page-heading"><div><p className="eyebrow"><time dateTime={activeDate}>{formatDay(activeDate, true)}</time></p><h1>{destination === 'for-you' ? 'For You' : entity?.name ?? 'Scores'}{tournament && <span className="title-detail">New York · Grand Slam</span>}</h1></div>
      {entity && !following.includes(destination) ? <button className="follow-button" onClick={() => onToggleFollow(destination)}><Icon name="plus" size={16}/>Follow</button> : liveCount > 0 && <span className="live-count" aria-label={`${liveCount} live ${liveCount === 1 ? 'event' : 'events'}`}><i/>{liveCount} live</span>}
    </div>
    <DateNav day={day} destination={destination} timeZone={timeZone} asOf={data.asOf}/>
    <div className="day-meta"><span>{events.length} {events.length === 1 ? 'event' : 'events'}{destination === 'for-you' ? ' across your follows' : ''}</span><span>All times {timezoneLabel(timeZone, data.asOf)}</span></div>
    <div className="scoreboard-body">
      {tennis && <>
        {!tournament && <a href={`#/scores/us-open/${day}`} className="tournament-banner"><span className="tournament-mark"><Icon name="ball" size={29}/></span><span><strong>US Open</strong><small>New York · Grand Slam · Hard court</small></span><Icon name="chevron" size={18}/></a>}
        <div className="tennis-filter"><div className="filter-options" role="group" aria-label="Tennis category">{['All', 'Men', 'Women'].map(item => <button key={item} onClick={() => setCategory(item)} aria-pressed={category === item} className={category === item ? 'active' : ''}>{item === 'All' ? 'All matches' : item}</button>)}</div><span className="secondary">Singles</span></div>
      </>}
      {!events.length ? <div className="empty-state"><Icon name="scores" size={32}/><h2>{following.length === 0 && destination === 'for-you' ? 'Your slate starts here' : `No events ${day}`}</h2><p>{following.length === 0 && destination === 'for-you' ? 'Follow a team, player, or competition to make this yours.' : `Nothing scheduled for ${entity?.shortName ?? 'your follows'} on this mock day.`}</p><a className="button-primary" href={following.length === 0 ? '#/search' : '#/scores/for-you/today'}>{following.length === 0 ? 'Find your follows' : 'Go to today’s For You'}<Icon name="arrow" size={16}/></a></div>
      : destination === 'for-you' ? <>
        <EventGroup title="Following closely" events={personal} timeZone={timeZone} from={from}/>
        {broadGroups.map(({ broad, groupEvents }) => broad.sport === 'tennis'
          ? <EventGroup key={broad.id} title="US Open" subtitle="ATP + WTA" events={groupEvents} timeZone={timeZone} from={from} tournament/>
          : broad.sport === 'soccer'
          ? <details key={broad.id} className="league-overflow"><summary><span><Mark mark={broad.mark} color={broad.color} small/>{groupEvents.length} {personal.some(event => event.sport === 'soccer') ? 'other ' : ''}{broad.shortName} {groupEvents.length === 1 ? 'match' : 'matches'}</span><Icon name="down" size={18}/></summary><div className="event-grid">{groupEvents.map(event => <ScoreCard key={event.id} event={event} timeZone={timeZone} from={from}/>)}</div></details>
          : <EventGroup key={broad.id} title={broad.shortName} subtitle={broad.sport === 'football' ? 'Week 1' : undefined} events={groupEvents} timeZone={timeZone} from={from}/>)}
      </> : tournament ? <>
        <div className="section-heading"><h2>Order of play</h2><span className="secondary">Men + Women</span></div>
        {groupByRoundInOrder(visible).map(group => <EventGroup key={group.round} title={group.round} events={group.events} timeZone={timeZone} from={from} showVenue/>)}
      </> : <EventGroup title={tennis ? 'Matches' : entity?.kind === 'Team' ? 'Matches' : entity?.name ?? 'Events'} events={visible} timeZone={timeZone} from={from}/>}
      {events.length > 0 && visible.length === 0 && <div className="empty-state"><h2>No {category.toLowerCase()}’s matches {day}</h2><button className="button-primary" onClick={() => setCategory('All')}>Show all matches</button></div>}
      {events.length > 0 && <div className="endnote"><span className="endnote-line"/><span>You’re all caught up</span><span className="endnote-line"/></div>}
    </div>
  </div>;
}

export function FollowRail({ following, destination, day }: { following: string[]; destination: string; day: Day }) {
  const railRef = useRef<HTMLElement>(null);
  const selectedRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const selected = selectedRef.current;
    if (!rail || !selected) return;
    const target = selected.offsetLeft + selected.offsetWidth / 2 - rail.clientWidth / 2;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollTo({ left: Math.max(0, target), behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [destination, following]);
  const destinations = [{ id: 'for-you', shortName: 'For You' }, ...following.map(id => entities.find(entity => entity.id === id)).filter(entity => entity !== undefined)];
  return <nav ref={railRef} className="follow-rail" aria-label="Followed scoreboards">{destinations.map(entity => <a key={entity.id} ref={destination === entity.id ? selectedRef : undefined} href={`#/scores/${entity.id}/${day}`} aria-current={destination === entity.id ? 'page' : undefined} className={destination === entity.id ? `active accent-${'color' in entity ? entity.color : 'neutral'}` : ''}>{entity.shortName}</a>)}<a className="rail-add" href="#/search" aria-label="Find more to follow"><Icon name="plus" size={16}/></a></nav>;
}
