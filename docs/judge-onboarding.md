# One-link judge onboarding

## Organiser flow

In the host/admin dashboard, open **Judge invite links**, choose the event(s), select **Create judge access link**, then copy the link to the invited judges. Share it privately: possession of a valid link is the existing approval mechanism.

The link opens `/invite/judge/{token}`. Both new and returning judges use the same **Continue with Google** button; there is no role picker, sign-up/login toggle, profile form or second approval step. Google creates the authentication account when needed. Existing signed-in judges/mentors are activated automatically. After the authoritative account profile is updated, the app opens the first assigned event's judging workspace.

Existing `/signup?role=judge&invite=...` and `/signin?role=judge&invite=...` links use the same page. An unfinished Google flow can resume from its pending judge invitation. Public judge sign-up without a valid invitation still requires organiser approval. Participant, host and administrator accounts are not silently converted; users can choose another Google account or ask the organiser to change their role.

## Reliability

- Invite validation handles missing, revoked, wrong-type and event-less invitations before activation. Malformed tokens never reach a Firestore document lookup.
- Account approval, event assignments and invite usage are written in one transaction. A failed write cannot leave a half-finished activation. Existing memberships and profile names are retained from the current database record, not a stale caller snapshot.
- Returning invitees do not consume another place and can reopen an otherwise-full link. Capacity for a new invitee is checked after sign-in inside the transaction; a signed-out person cannot be classified as new or returning yet.
- Auth/account changes and route unmounts prevent stale callbacks from navigating or changing the new session's UI. The app waits for the approved profile and event assignment rather than bouncing through the pending-approval dashboard. Slow profile refresh shows a reload option.
- Retry and popup-cancel feedback are available without signing out an unrelated account.

## Scope and security

This is a client onboarding improvement, not an authorization migration. No Firestore rules, Auth providers, production accounts, invitations or marks were changed for this request. It uses the existing organiser-issued invite permissions. The previous `submission-permissions-audit.json` findings still apply: administrator bootstrap, broad staff access/event isolation, and client-writable invite usage need a coordinated server-authority hardening project. Transactional capacity checking improves the normal client workflow; it is not a claim that malicious clients cannot manipulate the existing invite counters.

## Verification

- New service/UI tests cover one-step signup, signed-in pending/approved judges, legacy URLs, profile catch-up, retry, account switches, full-link re-entry, invalid/revoked links, malformed tokens, profile preservation and non-judge role preservation.
- All **83 emulator permission tests** passed, including six new invitation transaction cases: immediate scoring, pending-judge activation, repeat access, rollback, revocation and participant-role protection. The emulator used only the loopback demo project; no production test users or messages were created.
- TypeScript and targeted ESLint passed. The production build passed with the existing large-bundle warning.
- Browser inspection confirmed the local invitation page renders and gives clear feedback for an invalid test token without console errors. The real Google sign-in flow was not exercised with a production account.
- The first parallel full-suite run had one unrelated navigation timeout (658 passing tests). The reduced-concurrency rerun passed **all 660 tests across 88 files**, including 32 new judge onboarding/service tests. The final build and TypeScript/ESLint checks also passed.

These frontend changes have not been committed or pushed by this chat.
