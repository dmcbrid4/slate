import { selectParticipantEvents, splitPlayerSchedule } from '@/data/scoreboard';
import type { ScoreboardData } from '@/read-models/scoreboard-data';
import { Icon } from './Icon';
import { Mark } from './ScoreCard';
import { EventGroup } from './Scoreboard';

export function PlayerProfile({ data, id, from, timeZone }: { data: ScoreboardData; id: string; from: string; timeZone: string }) {
  const events = selectParticipantEvents(data, id);
  const identity = events[0]?.participants.find(participant => participant.id === id);

  if (!identity) return <>
    <a className="back-link" href={`#${from}`}><Icon name="back" size={18}/>Back to scores</a>
    <div className="empty-state"><Icon name="scores" size={32}/><h1>Player not found</h1><p>This player isn’t available. They may have moved or the link may be out of date.</p><a className="button-primary" href={`#${from}`}>Back to scores<Icon name="arrow" size={16}/></a></div>
  </>;

  const { upcoming, recent } = splitPlayerSchedule(events);

  return <>
    <a className="back-link" href={`#${from}`}><Icon name="back" size={18}/>Back to scores</a>
    <div className="detail-heading"><Mark mark={identity.mark} color={identity.color}/><h1>{identity.name}</h1></div>
    <EventGroup title="Upcoming" events={upcoming} timeZone={timeZone} from={from}/>
    <EventGroup title="Recent" events={recent} timeZone={timeZone} from={from}/>
  </>;
}
