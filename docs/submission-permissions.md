# Event hosting, submission and judging permissions

## Cause and fix

The public `elevenlabs-meetup-tokyo-2026` document was checked on 2026-10-09.
It was published with `sourceLifecycleAutomatic: true` and no `submissionMode`.
The old rule dereferenced this optional field directly. The emulator reproduced
`Property submissionMode is undefined on object`, which Firebase exposes to the
participant as `Missing or insufficient permissions`.

The rule now uses `data.get("submissionMode", "open")`, preserving the existing
legacy-event default and explicit organiser `paused` / `closed` locks. Optional
event IDs and team membership arrays are also handled without missing-field
errors. This does not set any live event to open or override organiser decisions.
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

The 38 emulator cases cover:

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

## Deployment status

**Local patch only. No production records, scores, or rules were changed.**
The current Firebase CLI account returned HTTP 403 for database list/get on
`hackathon-tokyo`, so the deployed rules and cloud database edition could not be
inspected. Access was checked again on 2026-10-11 and still returned 403.
The existing rules were compiled and exercised in the Standard
Firestore emulator; this is not evidence of a successful cloud deployment.

A project-authorised operator must review the deployed rules for drift, review
this patch, authenticate the CLI with the correct account, then deploy only the
rules (not other infrastructure):

```sh
npx --yes firebase-tools@15.33.0 deploy --only firestore:rules --project hackathon-tokyo
```

Deploy the application change through the normal release process too. Verify
with an authorised participant test account and judge test account afterwards;
do not modify real competition marks for testing.

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
