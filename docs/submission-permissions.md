# Event hosting, submission and judging permissions

## Cause and fix

The public `elevenlabs-meetup-tokyo-2026` document was checked on 2026-10-09.
It was published with `sourceLifecycleAutomatic: true` and no `submissionMode`.
The old rule dereferenced this optional field directly. The emulator reproduced
`Property submissionMode is undefined on object`, which Firebase exposes to the
participant as `Missing or insufficient permissions`.

The rule now reads optional fields safely with `data.get(...)`. Current rules
respect explicit organiser `paused` / `closed` locks, unpublished/past listings,
and imported event deadlines; an explicit `open` permits organiser reopening.
Optional event IDs and team membership arrays also avoid missing-field errors.
This does not set any live event to open or override organiser decisions.
See [Firebase's optional-field guidance](https://firebase.google.com/docs/firestore/security/rules-fields#enforcing_types_for_optional_fields).

Participants cannot inject or overwrite preliminary, legacy or final judge marks,
change the submission owner, or move an existing submission to another event.
Approved judges can change only their own entries in the score, notes and criteria
maps. Preliminary and final-round writes are separate; final marks require an
organiser shortlist decision. Existing host/admin management is preserved.
The client also rejects incomplete, non-finite, negative and over-weight marks.

## Verification

Install dependencies with `npm ci`. Rules tests require Java 21+ on PATH:

```sh
npm run test:rules
npm test -- --maxWorkers=4
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

`test:rules` uses the pinned Firebase CLI, `firebase.rules-test.json`, localhost
port 8280, and the **demo-cognisor-permissions** project. The test harness refuses
non-local emulator hosts and never uses production credentials or records.

The 42 emulator cases cover:

- Missing-field create/update, open/paused/closed gates and legacy records,
  including the portal's explicit Impact Tokyo backfill for event-less records.
- Owner and teammate dashboard queries, membership fallback, and opt-in gallery.
- Anonymous/unrelated-user denials; ownership and event-ID tampering.
- Participant mark injection on create/update and preserving existing marks.
- Judge saves/revisions with two judges, preventing overwrite/removal of peers.
- Pending judge rejection, invalid marks, final shortlist protection.
- Scoring paused events, organiser management, and own Top 3 ballot persistence.
- Denials must not rely on exhausted rules-expression or document-access limits.
- Full new-event flows for two arbitrary event IDs: draft, public listing,
  transactional criteria initialization, operations, tickets/check-in, judge
  contacts/invites/approval, participant enrollment/submission, marks and shortlist.
- Host access to unpublished/admin-assisted listings; safe legacy creator
  backfill; rejection of another host's management attempts and pending hosts.
- Imported deadlines, past/unpublished events, explicit organiser reopening,
  and Osaka's AI-video track edits by owners and linked teammates.

Application tests cover judge mark calculations, zero scores, invalid values,
round separation, the judge/host reports, and the existing application suite.

## Automatic access for future hosted events (2026-10-11)

Permissions follow roles and event ownership rather than a hardcoded event-ID
allowlist. Once an administrator approves a host, every event that host creates
uses the same permissions. There is no separate Firebase change per event.
Participant saves and invited/approved judges use those generic rules too.
Approval and explicit organiser submission locks are intentionally retained.

Admin-assisted publishing now retains the host's ownership. Existing listings
that name their publishing admin preserve that creator identity while the
`hostEventId` link allows the real host to manage them. The rule safely supports
linked legacy listings with missing creator metadata, without letting another
host claim them. Republishing no longer resets the event's judging rubric: a
transaction seeds default criteria only when no criteria document exists.

## Deployment status (2026-10-18, Asia/Tokyo)

**The tested Firestore rules are deployed and their live contents verified.**
The added CLI account `contact@cognisorai.com` has project access and is now the
default for this workspace. The existing global CLI account remains saved.
The target was `hackathon-tokyo`, database `(default)`, Standard edition in
`asia-northeast1`.

Before deployment, the live release was still dated 2026-08-14 and exactly
matched the rules in Git commit `930ce04b3bc506e17d1cedaaeb42e8b751b2e8a4`.
There was no untracked server-side rule drift to overwrite. All 42 local rules
tests passed, and Firebase CLI 15.34.0's rules-only deployment dry run succeeded.
The deployment targeted only `firestore:rules`, not indexes, Storage, Auth,
application hosting, or database records.

- Previous ruleset: `projects/hackathon-tokyo/rulesets/e2dc51d5-1729-4e6c-b6bf-044abdcbb96e`.
- Active ruleset: `projects/hackathon-tokyo/rulesets/4845dbf1-90da-47e6-8484-7a5f4fdbca67`.
- Release update: `2026-10-17T17:15:38.018400Z` (October 18 in Japan).
- Verified normalized SHA-256: `9fb71ec751dcfe48782279e9858f7d0d84e28ef526eccbaafd05317d676b82fa`.

The live rules were read back and matched the tested local file exactly.
No production participant records, event controls, or judge marks were changed.
Firebase emitted one non-blocking nullable-value type warning at line 428;
compilation, the dry run, deployment, and judge-map emulator cases succeeded.

This verification covers the rules release and emulator workflows, not a
production write under a real participant/judge session. Refresh the app and
retry the affected action. If access is still denied, inspect that action's
role, event gate and document path rather than broadly opening permissions.

## Scope and remaining review

This is a focused bug fix, not a full security certification. The security-rules
auditor skill prompted tests for create/update bypasses and judge-map ownership.
The existing broad approved-staff/host read policy and role/invite mechanisms
were not redesigned, so this patch does **not** establish event-level isolation.
Private judge notes remain in the same document that the project owner can read;
Firestore cannot hide selected fields of a readable document.

Before a broader rollout, review the legacy email-pattern admin bootstrap,
self-editable event assignments, invite/membership integrity, public/private
profile separation, and server-side validation of dynamic criterion values and
their totals. These need a coordinated authentication/data-model migration,
not silent changes to current accounts during a submission bug fix.
