import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv, prepareApprovedParticipants, registrationId, safeRosterRecord, participantMembershipPatch } from '../scripts/lib/approvedParticipantImport.mjs';
const csv = '\uFEFFguest_id,name,email,approval_status,created_at,How can you join ?\r\nguest-1,"Ada, Builder",ADA@example.com,approved,2026-10-18,Online\r\nguest-2,Grace,grace@example.com,approved,,Offline\r\n';
test('reads BOM, quoted commas, escaped quotes and embedded newlines', () => {
  assert.equal(prepareApprovedParticipants(csv, 'impact-osaka-2026').guests[0].displayName, 'Ada, Builder');
  assert.deepEqual(parseCsv('one,two\n"first\nsecond","a""b"\n'), [{one:'first\nsecond',two:'a"b'}]);
});
test('validates malformed CSV instead of dropping contact columns', () => {
  for(const source of ['a,b\n1', 'a,a\nx,y', 'a,b\n"unclosed,x', 'a,b\n"x"y,z']) assert.throws(() => parseCsv(source));
});
test('only approved guests are imported; blank mode remains unspecified', () => {
  const result = prepareApprovedParticipants(csv + 'guest-3,Lin,lin@example.com,pending,,\r\n', 'impact-osaka-2026');
  assert.equal(result.guests.length,2); assert.equal(result.skipped,1);
  assert.deepEqual(result.guests.map(guest => guest.attendanceMode), ['online','onsite']);
  assert.equal(prepareApprovedParticipants(csv.replace('Online',''), 'impact-osaka-2026').guests[0].attendanceMode,'unspecified');
});
test('stable opaque event and email identity prevents duplicate rerun rows', () => {
  assert.equal(registrationId('impact-osaka-2026', ' ADA@example.com '), registrationId('impact-osaka-2026', 'ada@example.com'));
  assert.notEqual(registrationId('other-event','ada@example.com'),registrationId('impact-osaka-2026','ada@example.com'));
  assert.match(registrationId('impact-osaka-2026','ada@example.com'), /^[0-9a-f]{64}$/);
});
test('rejects duplicate email/guest IDs, malformed emails and names containing email', () => {
  for(const invalid of [csv.replace('grace@example.com','ada@example.com'), csv.replace('guest-2','guest-1'), csv.replace('grace@example.com','invalid'),csv.replace('Grace','grace@example.com')]) assert.throws(() => prepareApprovedParticipants(invalid,'impact-osaka-2026'));
});
test('judge projection contains only name, participation mode and approval metadata', () => {
  const guest = prepareApprovedParticipants(csv, 'impact-osaka-2026').guests[0];
  const record = safeRosterRecord(guest);
  assert.deepEqual(Object.keys(record).sort(),['approval_status','attendance_mode','display_name','source']);
  assert.equal(JSON.stringify(record).includes('@'),false);
  assert.equal(JSON.stringify(record).includes(guest.guestId),false);
});
test('membership import preserves roles, primary events and user profile edits', () => {
  assert.deepEqual(participantMembershipPatch({role:'participant',hackathon_id:'old-event',hackathon_ids:['old-event'],fullName:'Chosen name'},'impact-osaka-2026','Imported'),{hackathon_ids:['old-event','impact-osaka-2026']});
  assert.deepEqual(participantMembershipPatch({role:'judge',hackathon_id:'old-event'},'impact-osaka-2026','Imported'),{});
  assert.deepEqual(participantMembershipPatch({role:'participant',hackathon_id:'impact-osaka-2026',hackathon_ids:['impact-osaka-2026'],fullName:'Name'},'impact-osaka-2026','Imported'),{});
});
test('legacy primary membership survives malformed or incomplete list', () => {
  const patch=participantMembershipPatch({role:'participant',hackathon_id:'old-event',hackathon_ids:[]},'impact-osaka-2026','Name');
  assert.deepEqual(patch.hackathon_ids,['old-event','impact-osaka-2026']);
  assert.equal('fullName' in patch,false);
  assert.equal('onboardingCompletedAt' in patch,false);
});
