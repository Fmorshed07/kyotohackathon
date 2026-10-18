import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ collection:vi.fn(),limit:vi.fn(),query:vi.fn(),onSnapshot:vi.fn() }));
vi.mock('firebase/firestore',() => mocks);
import type { Firestore } from 'firebase/firestore';
import { parseEventParticipant, subscribeToEventParticipants } from '@/lib/eventParticipants';
const db={} as Firestore;
const record={display_name:'Ada Builder',attendance_mode:'online',approval_status:'approved',source:'luma'};
describe('event participant projection',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it('returns only safe fields',()=>expect(parseEventParticipant('opaque',record)).toEqual({id:'opaque',displayName:'Ada Builder',attendanceMode:'online'}));
  it.each([{...record,email:'secret@example.com'},{...record,phone:'private'},{...record,display_name:'secret@example.com'},{...record,attendance_mode:'unknown'},{...record,approval_status:'pending'},{...record,display_name:' '}])('rejects invalid or private fields',data=>expect(parseEventParticipant('opaque',data)).toBeNull());
  it('reads only the event roster and sorts by name',()=>{
    const stop=vi.fn();mocks.onSnapshot.mockImplementation((_q,onRows)=>{onRows({docs:[{id:'two',data:()=>({...record,display_name:'Zed'})},{id:'one',data:()=>record}]});return stop;});
    const rows=vi.fn();const unsubscribe=subscribeToEventParticipants(db,'impact-osaka-2026',rows,vi.fn());
    expect(mocks.collection).toHaveBeenCalledWith(db,'hackathons','impact-osaka-2026','participant_roster');
    expect(mocks.limit).toHaveBeenCalledWith(500);
    expect(rows.mock.calls[0][0].map((row:{displayName:string})=>row.displayName)).toEqual(['Ada Builder','Zed']);
    unsubscribe();expect(stop).toHaveBeenCalled();
  });
  it('does not expose provider errors containing private request details',()=>{
    mocks.onSnapshot.mockImplementation((_q,_onRows,onError)=>{onError(new Error('secret@example.com'));return vi.fn();});
    const error=vi.fn();subscribeToEventParticipants(db,'impact-osaka-2026',vi.fn(),error);
    expect(error.mock.calls[0][0].message).not.toContain('@');
  });
});
