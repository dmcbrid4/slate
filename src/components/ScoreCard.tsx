import type {
  BaseballScoreboardEvent,
  FootballScoreboardEvent,
  ScoreboardEvent,
  ScoreboardParticipant,
  SoccerScoreboardEvent,
  TennisScoreboardEvent,
} from '@/read-models/scoreboard';
import { eventHref, formatTime } from '@/lib/scores';
import { Icon } from './Icon';

export function Mark({ mark, color, small = false }: { mark: string; color: string; small?: boolean }) {
  return <span className={`entity-mark ${color} ${small ? 'small' : ''}`} aria-hidden="true">{mark}</span>;
}

function ordinal(n: number) {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function outsLabel(n: number) {
  return `${n} out${n === 1 ? '' : 's'}`;
}

export function Status({ event, timeZone }: { event: ScoreboardEvent; timeZone: string }) {
  if (event.status === 'scheduled') return <span className="event-status">{formatTime(event.start, timeZone)}</span>;
  if (event.status === 'final') return <span className="event-status final">Final</span>;
  if (event.status !== 'live') return <span className="event-status final">{event.status[0].toUpperCase() + event.status.slice(1)}</span>;
  const label = event.sport === 'soccer' ? event.minute ?? 'Live'
    : event.sport === 'baseball' ? event.inning === undefined ? 'Live' : `${event.half === 'Top' ? 'Top' : 'Bot'} ${ordinal(event.inning)}`
    : event.sport === 'football' ? event.clock ?? 'Live' : 'Live';
  return <span className="event-status live"><i/>{label}</span>;
}

function TeamRow({ participant, score, winning, possession }: { participant: ScoreboardParticipant; score?: number; winning?: boolean; possession?: boolean }) {
  return <div className={`team-row ${winning ? 'winning' : ''}`}>
    <Mark {...participant} small/><span className="participant-name">{participant.name}</span>
    {possession && <span className="possession-dot" role="img" aria-label="In possession"/>}
    {score !== undefined && <strong className="team-score">{score}</strong>}
  </div>;
}

export function SoccerScore({ event }: { event: SoccerScoreboardEvent }) {
  return <>
    <div className="team-lines">{event.participants.map((participant, i) => {
      const scorers = event.goals.filter(goal => goal.side === i);
      return <div className="soccer-team-line" key={participant.short}>
        <TeamRow participant={participant} score={event.score?.[i]} winning={event.status === 'final' && (event.score?.[i] ?? 0) > (event.score?.[1 - i] ?? 0)}/>
        {event.status !== 'scheduled' && scorers.length > 0 && <div className="soccer-scorers">{scorers.map(goal => [goal.player, goal.minute].filter(Boolean).join(' ')).join(', ')}</div>}
      </div>;
    })}</div>
    {event.status === 'scheduled' && <div className="score-footnote">{event.venue}</div>}
  </>;
}

export function TennisScore({ event }: { event: TennisScoreboardEvent }) {
  const count = event.sets[0].length;
  return <div className="tennis-score">
    {count > 0 && <div className="tennis-columns" aria-hidden="true"><span/>{event.sets[0].map((_, i) => <span key={i}>{i + 1}</span>)}{event.points && <span>PTS</span>}</div>}
    {event.participants.map((participant, i) => <div className="tennis-player" key={participant.short}>
      <span className="tennis-name"><Mark {...participant} small/><span className="participant-name">{participant.name}<small>{participant.seed}</small></span>{event.server === i && event.status === 'live' && <span className="serve-dot" role="img" aria-label={`${participant.name} serving`}/>}</span>
      {event.sets[i].map((score, set) => <span key={set} aria-label={`Set ${set + 1}: ${score} games`} className={`set-score ${set === count - 1 && event.status === 'live' ? 'active-set' : ''} ${score > event.sets[1 - i][set] ? 'set-won' : ''}`}>{score}</span>)}
      {event.points && <strong className="point-score" aria-label={`${event.points[i]} points`}>{event.points[i]}</strong>}
    </div>)}
    {event.status === 'live' && <div className="score-footnote"><span className="tennis-ball">●</span> Set {count}{event.server === undefined ? '' : ` · ${event.participants[event.server].short} serving`}</div>}
    {event.status === 'scheduled' && <div className="score-footnote">{event.venue}</div>}
  </div>;
}

export function BaseDiamond({ bases }: { bases: readonly [boolean, boolean, boolean] }) {
  return <span className="base-diamond" role="img" aria-label={`Runners: ${bases.map((occupied, i) => occupied ? ['first', 'second', 'third'][i] : null).filter(Boolean).join(' and ') || 'bases empty'}`}>
    <i className={`base second ${bases[1] ? 'occupied' : ''}`}/><i className={`base third ${bases[2] ? 'occupied' : ''}`}/><i className={`base first ${bases[0] ? 'occupied' : ''}`}/>
  </span>;
}

export function BaseballScore({ event }: { event: BaseballScoreboardEvent }) {
  return <>
    <div className="baseball-score"><div className="team-lines">{event.participants.map((participant, i) => <TeamRow key={participant.short} participant={participant} score={event.score?.[i]} winning={event.status === 'final' && (event.score?.[i] ?? 0) > (event.score?.[1 - i] ?? 0)}/>)}</div>
      {event.status === 'live' && event.bases && <div className="diamond-wrap"><BaseDiamond bases={event.bases}/>{event.outs !== undefined && <span className="outs" aria-label={outsLabel(event.outs)}>{[0, 1, 2].map(i => <i key={i} className={i < event.outs! ? 'filled' : ''}/>)}</span>}</div>}
    </div>
    <div className="score-footnote">{event.status === 'live' ? <>{event.batter && <><strong>{event.batter}</strong> batting</>}{event.batter && (event.count || event.outs !== undefined) ? ' · ' : ''}{event.count ? `${event.count} count` : ''}{event.count && event.outs !== undefined ? ' · ' : ''}{event.outs !== undefined ? outsLabel(event.outs) : ''}</> : event.status === 'final' ? event.decision : event.pitchers ? `${event.pitchers[0].split(' ').at(-1)} vs ${event.pitchers[1].split(' ').at(-1)}` : 'Pitchers TBD'}</div>
  </>;
}

export function FootballScore({ event }: { event: FootballScoreboardEvent }) {
  return <>
    <div className="team-lines">{event.participants.map((participant, i) => <TeamRow key={participant.short} participant={participant} score={event.score?.[i]} possession={event.status === 'live' && event.possession === i} winning={event.status === 'final' && (event.score?.[i] ?? 0) > (event.score?.[1 - i] ?? 0)}/>)}</div>
    <div className="score-footnote">{event.status === 'live' ? <>{event.possession === undefined ? 'Possession unavailable' : `${event.participants[event.possession].short} ball`}{event.situation && <> · <strong>{event.situation}</strong></>}</> : event.status === 'scheduled' ? event.venue : 'Week 1'}</div>
  </>;
}

export function SportScore({ event }: { event: ScoreboardEvent }) {
  switch (event.sport) {
    case 'soccer': return <SoccerScore event={event}/>;
    case 'tennis': return <TennisScore event={event}/>;
    case 'baseball': return <BaseballScore event={event}/>;
    case 'football': return <FootballScore event={event}/>;
  }
}

export function ScoreCard({ event, timeZone, from }: { event: ScoreboardEvent; timeZone: string; from: string }) {
  return <a className={`score-card ${event.sport}`} href={eventHref(event.id, from)}>
    <div className="card-meta"><span>{event.sport === 'tennis' ? `${event.category}’s singles · ${event.round}` : event.competition}</span><Status event={event} timeZone={timeZone}/></div>
    <SportScore event={event}/>
    {event.context && <div className="context"><Icon name="arrow" size={14}/><span>{event.context}</span></div>}
    <span className="sr-only">Open event details</span>
  </a>;
}
