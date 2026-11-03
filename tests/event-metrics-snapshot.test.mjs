import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEventMetricsSnapshot } from '../scripts/lib/eventMetricsSnapshot.mjs';

const capturedAt = '2026-11-03T12:00:00.000Z';
const tokyo = 'impact-tokyo';
const osaka = 'impact-osaka-2026';
const dynamic = 'published-new-edition';
const defaults = [tokyo, 'impact-kyoto', 'impact-dhaka', 'elevenlabs-meetup-tokyo-2026', osaka];
const countKeys = [
  'portalParticipantAccounts', 'projectRecords', 'namedProjectRecords',
  'videoProjectRecords', 'publicProjectRecords', 'approvedImportedRegistrations',
];
const emptyInput = patch => ({ events: [], users: [], projects: [], registrations: [], publicProjects: [], ...patch });
const snapshot = patch => buildEventMetricsSnapshot(emptyInput(patch), capturedAt);
const forEvent = (result, eventId) => {
  const row = result.events.find(row => row.eventId === eventId);
  assert.ok(row, `Expected a report for ${eventId}`);
  return row;
};
const participant = patch => ({ role: 'participant', ...patch });

describe('public event metrics snapshot counting', () => {
  it('includes the five public defaults and records observed zeros as numeric zero', () => {
    const result = snapshot({});
    assert.equal(result.capturedAt, capturedAt);
    assert.deepEqual(result.events.map(row => row.eventId).sort(), defaults.toSorted());
    for (const row of result.events) {
      for (const key of countKeys) assert.equal(row[key], 0, `${row.eventId}: ${key}`);
    }
  });

  it('adds published editions while honoring explicit hidden cloud overrides, including bundled defaults', () => {
    const result = snapshot({
      events: [
        { id: dynamic, data: { published: true, name: 'Visible edition' } },
        { id: 'private-event', data: { published: false, name: 'sensitive-private-event-name' } },
        { id: 'unpublished-event', data: { name: 'sensitive-unpublished-name' } },
        { id: 'impact-kyoto', data: { published: false } },
        { id: osaka, data: {} },
        { id: 'elevenlabs-meetup-tokyo-2026', data: { published: true } },
      ],
      users: [participant({ hackathon_ids: [dynamic, 'private-event'] })],
      projects: [{ hackathon_id: 'private-event', title: 'sensitive-private-project' }],
      registrations: [{ hackathon_id: 'private-event', approval_status: 'approved', email: 'private@example.com' }],
    });
    assert.deepEqual(result.events.map(row => row.eventId).sort(), [tokyo, 'impact-dhaka', 'elevenlabs-meetup-tokyo-2026', dynamic].sort());
    assert.equal(forEvent(result, dynamic).portalParticipantAccounts, 1);
    assert.ok(!JSON.stringify(result).includes('sensitive-'));
    assert.ok(!result.events.some(row => ['private-event', 'unpublished-event', 'impact-kyoto', osaka].includes(row.eventId)));
  });

  it('counts participant accounts per event using the authoritative membership array with legacy fallback', () => {
    const result = snapshot({
      users: [
        participant({ hackathon_ids: [osaka, osaka, tokyo], hackathon_id: 'impact-dhaka' }),
        participant({ hackathon_ids: [], hackathon_id: osaka }),
        participant({ hackathon_id: osaka }),
        participant({ hackathon_ids: null, hackathon_id: osaka }),
        { role: ' PARTICIPANTS ', hackathon_ids: [osaka] },
        participant({ hackathon_ids: [null, 123, 'not valid'], hackathon_id: osaka }),
        { role: 'judge', hackathon_ids: [osaka], judgeApprovalStatus: 'approved' },
        { role: 'admin', hackathon_ids: [osaka] },
        { role: 'host', hackathon_ids: [osaka] },
        { hackathon_ids: [osaka] },
      ],
    });
    assert.equal(forEvent(result, osaka).portalParticipantAccounts, 4);
    assert.equal(forEvent(result, tokyo).portalParticipantAccounts, 1);
    assert.equal(forEvent(result, 'impact-dhaka').portalParticipantAccounts, 0);
  });

  it('counts account records separately even when two records share an email, without publishing that email', () => {
    const result = snapshot({
      users: [
        participant({ email: 'duplicate-private@example.com', hackathon_ids: [osaka] }),
        participant({ email: 'duplicate-private@example.com', hackathon_ids: [osaka] }),
      ],
    });
    assert.equal(forEvent(result, osaka).portalParticipantAccounts, 2);
    assert.ok(!JSON.stringify(result).includes('duplicate-private@example.com'));
  });

  it('uses the portal legacy Tokyo fallback for missing, blank or invalid project event IDs', () => {
    const result = snapshot({
      projects: [
        {}, { hackathon_id: null }, { hackathon_id: '' }, { hackathon_id: '   ' },
        { hackathon_id: 'not/a/slug' }, { hackathon_id: 42 },
        { hackathon_id: tokyo }, { hackathon_id: osaka }, { hackathon_id: 'unknown-valid-event' },
      ],
    });
    assert.equal(forEvent(result, tokyo).projectRecords, 7);
    assert.equal(forEvent(result, osaka).projectRecords, 1);
    assert.equal(result.events.reduce((total, row) => total + row.projectRecords, 0), 8);
  });

  it('counts mapped nonblank titles and video fields without treating drafts, links or scores as valid submissions', () => {
    const result = snapshot({
      projects: [
        { hackathon_id: osaka, title: 'Named draft', demo_video_url: 'not-a-validated-url' },
        { hackathon_id: osaka, title: 0, demo_video_url: 0 },
        { hackathon_id: osaka, title: 24, demo_video_url: { url: 'https://example.com/video' } },
        { hackathon_id: osaka, title: ' ', demo_video_url: { href: 'https://example.com/href' } },
        { hackathon_id: osaka, title: null, demo_video_url: { url: ' ', link: 'https://example.com/link' } },
        { hackathon_id: osaka, title: false, demo_video_url: { src: 'https://example.com/src' } },
        { hackathon_id: osaka, title: {}, demo_video_url: { url: '' } },
        { hackathon_id: osaka, title: Infinity, demo_video_url: Infinity },
        { hackathon_id: osaka, title: NaN, demo_video_url: { url: { url: 'https://example.com/nested-too-deep' } } },
        { hackathon_id: osaka, demo_video_url: false },
      ],
    });
    const row = forEvent(result, osaka);
    assert.equal(row.projectRecords, 10);
    assert.equal(row.namedProjectRecords, 3);
    assert.equal(row.videoProjectRecords, 6);
  });

  it('counts saved public projections with consent withdrawal excluded and legacy attribution preserved', () => {
    const result = snapshot({
      publicProjects: [
        { hackathon_id: osaka, public_preview_consent: true },
        { hackathon_id: osaka },
        { hackathon_id: osaka, public_preview_consent: false },
        { public_preview_consent: true },
        { hackathon_id: null },
        { hackathon_id: 'bad/event' },
        { public_preview_consent: false },
        { hackathon_id: 'unknown-valid-event', public_preview_consent: true },
      ],
    });
    assert.equal(forEvent(result, osaka).publicProjectRecords, 2);
    assert.equal(forEvent(result, tokyo).publicProjectRecords, 3);
    assert.equal(forEvent(result, osaka).projectRecords, 0);
  });

  it('reports approved imported registration records without adding them to accounts or multiplying measured values', () => {
    const result = snapshot({
      users: Array.from({ length: 3 }, () => participant({ hackathon_ids: [osaka] })),
      projects: Array.from({ length: 2 }, (_, index) => ({ hackathon_id: osaka, title: `Draft ${index}` })),
      registrations: [
        { hackathon_id: osaka, approval_status: 'approved', matched_user_id: 'account-a' },
        { hackathon_id: osaka, approval_status: 'approved', matched_user_id: null },
        { hackathon_id: osaka, approval_status: 'pending' },
        { hackathon_id: osaka, approval_status: 'rejected' },
        { hackathon_id: tokyo, approval_status: 'approved' },
        { hackathon_id: 'unknown-valid-event', approval_status: 'approved' },
      ],
    });
    const row = forEvent(result, osaka);
    assert.equal(row.portalParticipantAccounts, 3);
    assert.equal(row.projectRecords, 2);
    assert.equal(row.approvedImportedRegistrations, 2);
    assert.equal(forEvent(result, tokyo).approvedImportedRegistrations, 1);
    assert.equal(forEvent(result, 'impact-kyoto').approvedImportedRegistrations, 0);
    assert.ok(!Object.hasOwn(row, 'totalParticipants'));
  });

  it('publishes only event IDs and aggregate count keys, never private identity, metadata, project details or marks', () => {
    const privateDoc = {
      email: 'sensitive-person@example.com', fullName: 'sensitive-person-name',
      display_name: 'sensitive-registrant-name', source_guest_id: 'sensitive-guest-id',
      owner_email: 'sensitive-owner@example.com', owner_id: 'sensitive-owner-id',
      member_user_ids: ['sensitive-member-id'], team_name: 'sensitive-team-name',
      title: 'sensitive-project-title', short_description: 'sensitive-project-description',
      demo_video_url: 'https://example.com/sensitive-demo-link',
      judge_score: 91, judge_notes: 'sensitive-private-judging-notes',
      judge_scores: { 'sensitive-judge-id': 88 },
    };
    const input = emptyInput({
      events: [{ id: dynamic, data: { published: true, name: 'sensitive-event-name', location: 'sensitive-event-location', sourceUrl: 'https://example.com/sensitive-source' } }],
      users: [participant({ ...privateDoc, hackathon_ids: [dynamic] })],
      projects: [{ ...privateDoc, hackathon_id: dynamic }],
      registrations: [{ ...privateDoc, hackathon_id: dynamic, approval_status: 'approved' }],
      publicProjects: [{ ...privateDoc, hackathon_id: dynamic, public_preview_consent: true }],
    });
    const before = structuredClone(input);
    const result = buildEventMetricsSnapshot(input, capturedAt);
    assert.deepEqual(input, before);
    assert.deepEqual(Object.keys(result).sort(), ['basis', 'capturedAt', 'events']);
    assert.equal(typeof result.basis, 'string');
    for (const row of result.events) {
      assert.deepEqual(Object.keys(row).sort(), ['eventId', ...countKeys].sort());
      for (const key of countKeys) {
        assert.equal(typeof row[key], 'number');
        assert.ok(Number.isSafeInteger(row[key]) && row[key] >= 0);
      }
    }
    assert.doesNotMatch(JSON.stringify(result), /sensitive-|@|judge_score|judge_notes|source_guest_id|owner_id|fullName|display_name/);
  });
});
