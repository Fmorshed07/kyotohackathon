import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@/types/portal';
import type { EventParticipant } from '@/lib/eventParticipants';
const mocks = vi.hoisted(() => ({ user:null as SessionUser|null,loading:false,subscribe:vi.fn() }));
vi.mock('@/hooks/usePortalAuth',()=>({usePortalAuth:()=>({sessionUser:mocks.user,loading:mocks.loading})}));
vi.mock('@/lib/firebaseClient',()=>({getFirestoreDb:()=>({})}));
vi.mock('@/lib/eventParticipants',()=>({subscribeToEventParticipants:mocks.subscribe}));
vi.mock('@/components/dashboard/DashboardLayout',()=>({sectionClass:''}));
import { AdminEventParticipants } from '@/components/dashboard/AdminEventParticipants';
let streams:{rows:(rows:EventParticipant[])=>void;stop:ReturnType<typeof vi.fn>}[];
beforeEach(()=>{vi.clearAllMocks();mocks.loading=false;mocks.user={id:'admin',email:'admin@example.test',role:'admin'};streams=[];mocks.subscribe.mockImplementation((_db,_id,rows)=>{const stream={rows,stop:vi.fn()};streams.push(stream);return stream.stop;});});
afterEach(cleanup);
describe('admin registration roster',()=>{
  it('only subscribes for actual loaded admin sessions',()=>{
    mocks.user={id:'judge',email:'judge@example.test',role:'judge'};
    const view=render(<AdminEventParticipants eventId="impact-osaka-2026" eventName="Impact Osaka" />);
    expect(mocks.subscribe).not.toHaveBeenCalled();
    mocks.user={id:'admin',email:'admin@example.test',role:'admin'};mocks.loading=true;
    view.rerender(<AdminEventParticipants eventId="impact-osaka-2026" eventName="Impact Osaka" />);
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });
  it('loads the safe roster and removes stale rows on event changes or demotion',()=>{
    const view=render(<AdminEventParticipants eventId="impact-osaka-2026" eventName="Impact Osaka" />);
    act(()=>streams[0].rows([{id:'opaque',displayName:'Sample Builder',attendanceMode:'online'}]));
    expect(screen.getByText('Sample Builder')).toBeInTheDocument();
    view.rerender(<AdminEventParticipants eventId="another-event" eventName="Another event" />);
    expect(screen.queryByText('Sample Builder')).not.toBeInTheDocument();expect(streams[0].stop).toHaveBeenCalled();
    act(()=>streams[0].rows([{id:'stale',displayName:'Stale Builder',attendanceMode:'online'}]));
    expect(screen.queryByText('Stale Builder')).not.toBeInTheDocument();
    mocks.user={id:'judge',email:'judge@example.test',role:'judge'};
    view.rerender(<AdminEventParticipants eventId="another-event" eventName="Another event" />);
    expect(screen.queryByText('Registered participants')).not.toBeInTheDocument();
  });
});
