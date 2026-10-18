import { useEffect, useState } from 'react';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { getFirestoreDb } from '@/lib/firebaseClient';
import { subscribeToEventParticipants, type EventParticipant } from '@/lib/eventParticipants';
import { JudgeParticipantRoster } from './JudgeParticipantRoster';

/** Administrators review the same contact-free roster published to judges. */
export function AdminEventParticipants({ eventId, eventName }: { eventId: string; eventName: string }) {
  const { sessionUser, loading } = usePortalAuth();
  const [retry, setRetry] = useState(0);
  const scope = !loading && sessionUser?.role === 'admin' ? `${sessionUser.id}:${eventId}` : '';
  const [state, setState] = useState<{ scope: string; rows: EventParticipant[]; error: string | null; loading: boolean }>({scope:'',rows:[],error:null,loading:true});
  useEffect(() => {
    if (!scope) return;
    let active = true;
    setState({scope,rows:[],error:null,loading:true});
    const stop = subscribeToEventParticipants(getFirestoreDb(),eventId,rows => {
      if (active) setState({scope,rows,error:null,loading:false});
    }, () => {
      if (active) setState({scope,rows:[],error:'The participant roster could not be loaded. Please try again.',loading:false});
    });
    return () => { active = false; stop(); };
  }, [scope, eventId, retry]);
  if (!scope) return null;
  return <JudgeParticipantRoster key={scope} eventName={eventName} participants={state.scope === scope ? state.rows : []} isLoading={state.scope !== scope || state.loading} error={state.scope === scope ? state.error : null} onRetry={() => setRetry(value => value + 1)} />;
}
