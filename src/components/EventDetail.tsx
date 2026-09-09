import type { BaseballScoreboardEvent, FootballScoreboardEvent, ScoreboardEvent } from '@/read-models/scoreboard';
import type { ScoreboardData } from '@/read-models/scoreboard-data';
import { formatTime, playerHref } from '@/lib/scores';
import { Icon } from './Icon';
import { Status, SportScore } from './ScoreCard';

function PeriodTable({ event }: { event: BaseballScoreboardEvent | FootballScoreboardEvent }) {
  const periods = event.sport === 'baseball' ? event.innings : event.quarters;
  if (!periods) return null;
  const count = event.sport === 'baseball' ? 9 : 4;
  return <section className="detail-section"><h2>{event.sport === 'baseball' ? 'Line score' : 'By quarter'}</h2><div className="table-scroll"><table className="period-table"><caption className="sr-only">{event.sport === 'baseball' ? 'Runs by inning' : 'Points by quarter'}</caption><thead><tr><th scope="col">Team</th>{Array.from({ length: count }, (_, i) => <th scope="col" key={i}>{i + 1}</th>)}<th scope="col">{event.sport === 'baseball' ? 'R' : 'T'}</th>{event.sport === 'baseball' && <><th scope="col">H</th><th scope="col">E</th></>}</tr></thead><tbody>{event.participants.map((p, side) => <tr key={p.short}><th scope="row">{p.short}</th>{Array.from({ length: count }, (_, i) => <td key={i}>{periods[side][i] ?? '–'}</td>)}<td className="total">{event.score?.[side]}</td>{event.sport === 'baseball' && <><td>{event.hits?.[side] ?? '–'}</td><td>{event.errors?.[side] ?? '–'}</td></>}</tr>)}</tbody></table></div></section>;
}

function SportDetail({ event }: { event: ScoreboardEvent }) {
  switch (event.sport) {
    case 'soccer': return event.status !== 'scheduled' ? <section className="detail-section"><h2>Goals</h2><div className="goal-list">{event.goals.map((goal, i) => <div className="goal-row" key={i}><span className="goal-minute">{goal.minute}</span><Icon name="ball" size={18}/><strong>{goal.player}</strong><span>{event.participants[goal.side].name}</span></div>)}</div></section> : null;
    case 'tennis': return <section className="detail-section"><h2>{event.status === 'live' ? 'On court' : 'Match information'}</h2><dl className="detail-facts"><div><dt>Event</dt><dd>{event.category}’s singles</dd></div><div><dt>Round</dt><dd>{event.round}</dd></div><div><dt>Format</dt><dd>Best of {event.bestOf ?? (event.category === 'Men' ? 5 : 3)} sets</dd></div>{event.duration && <div><dt>Time on court</dt><dd>{event.duration}</dd></div>}{event.status === 'live' && event.server !== undefined && <div><dt>Serving</dt><dd>{event.participants[event.server].name}</dd></div>}<div><dt>Surface</dt><dd>Hard court · Outdoor</dd></div></dl></section>;
    case 'baseball': return <><PeriodTable event={event}/>{event.pitchers && <section className="detail-section"><h2>{event.status === 'scheduled' ? 'Probable pitchers' : 'Starting pitchers'}</h2><dl className="detail-facts">{event.pitchers.map((pitcher, i) => <div key={pitcher}><dt>{event.participants[i].name}</dt><dd>{pitcher}</dd></div>)}</dl></section>}</>;
    case 'football': return <><PeriodTable event={event}/>{event.status === 'live' && event.possession !== undefined && <section className="detail-section"><h2>Current possession</h2><div className="possession-panel"><span className="possession-dot"/><strong>{event.participants[event.possession].name}</strong>{event.situation && <span>{event.situation}</span>}</div></section>}</>;
  }
}

export function EventDetail({ data, id, from, timeZone }: { data: ScoreboardData; id: string; from: string; timeZone: string }) {
  const event = data.records.find(record => record.eventId === id)?.event;
  if (!event) return <><a className="back-link" href={`#${from}`}><Icon name="back" size={18}/>Back to scores</a><div className="empty-state"><Icon name="scores" size={32}/><h1>Event not found</h1><p>This event isn’t available. It may have moved or the link may be out of date.</p><a className="button-primary" href={`#${from}`}>Back to scores<Icon name="arrow" size={16}/></a></div></>;
  return <>
    <a className="back-link" href={`#${from}`}><Icon name="back" size={18}/>Back to scores</a>
    <div className="detail-heading"><p className="eyebrow">{event.competition}{event.sport === 'tennis' ? ` · ${event.round}` : event.sport === 'football' ? ' · Week 1' : ''}</p><h1>{event.sport === 'tennis' ? <>
      <a href={playerHref(event.participants[0].id, from)}>{event.participants[0].name}</a> <span>vs</span> <a href={playerHref(event.participants[1].id, from)}>{event.participants[1].name}</a>
    </> : <>{event.participants[0].name} <span>vs</span> {event.participants[1].name}</>}</h1></div>
    <div className={`detail-score score-card ${event.sport}`}><div className="card-meta"><span>{event.sport === 'tennis' ? `${event.category}’s singles` : 'Match center'}</span><Status event={event} timeZone={timeZone}/></div><SportScore event={event}/>{event.context && <div className="context"><Icon name="arrow" size={14}/><span>{event.context}</span></div>}</div>
    <SportDetail event={event}/>
    <section className="detail-section"><h2>Event details</h2><dl className="detail-facts"><div><dt>Venue</dt><dd>{event.venue}</dd></div><div><dt>Start</dt><dd>{new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' }).format(new Date(event.start))} · {formatTime(event.start, timeZone)}</dd></div></dl></section>
    {event.sport === 'tennis' && <a className="tournament-detail-link" href={`#/scores/us-open/${from.split('/').at(-1) || 'today'}`}><span className="tournament-mark"><Icon name="ball" size={24}/></span><span><strong>US Open</strong><small>Men’s and women’s matches, together</small></span><Icon name="chevron" size={18}/></a>}
    <p className="small-note">Mock snapshot · Scores and match details are illustrative.</p>
  </>;
}
