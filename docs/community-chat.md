# Community networking channels

Open `/community` from the site navigation or **Community chat** in the dashboard's Resources section.

- `?channel=general`: introductions, networking and discussion.
- `?channel=teams`: find teammates; share the event, idea, skills and availability.
- `?channel=judges`: general questions and guidance from judges and mentors, not private marks or judging notes.

All registered participants, judges, mentors, hosts and admins can read and post across events. Event enrollment and staff approval are not required to network. Signed-out visitors see a sign-in prompt, not messages. Anonymous Firebase users and accounts without a recognized portal role are denied. Pending staff can chat but display as `member`.

## Behavior

Messages arrive through a single bounded Firestore listener for the active room. The latest 100 are shown chronologically, with local search. Enter sends; Shift+Enter inserts a line break; Japanese IME composition does not submit. A failed send preserves the draft. Room/account changes reset the draft and unsubscribe from the previous room. Offline/cache-only connections disable sending until the server reconnects.

Messages contain display names, posting-time role labels, text and timestamps. The client never automatically copies account emails or private profile fields. Display names are user-chosen, not verified identities. Role labels are historical and grant no authority. HTTP(S) links open separately; message text is not interpreted as HTML.

Authors can permanently delete their own messages after confirmation. Message editing, attachments, private messages, reporting and moderator deletion are not included. Older messages remain stored but are not paginated in this version. A 3-second per-account cooldown applies across rooms; this is not a global anti-abuse or multi-account spam solution.

## Data and rules

- `community_channels/{general|teams|judges}/messages/{autoId}`: exact schema of `user_id`, `author_name`, `author_role`, `body`, `created_at`. Body is nonblank and at most 2,000 characters; names are nonblank and at most 80 characters. Creation time must be server time. All updates are denied; deletion requires author ownership.
- `community_chat_limits/{uid}`: `channel_id`, `message_id`, `last_sent_at`, atomically written with one new message. Pairing, ownership, server time and cooldown are validated; clients cannot delete or reset the limiter.
- Channels are fixed virtual rooms; no parent documents need seeding. Unknown rooms and unbounded/list queries over 100 messages are denied. The timestamp query uses a standard single-field index; no composite index or Storage changes are needed.

The rules additions leave existing event, submission, judging and account permissions unchanged. See `community-chat-permissions-audit.json` for the scoped assessment and inherited risks. These are prototype rules, not an overall production security approval. Existing administrator bootstrap and role-assignment risks need a separate coordinated hardening change; broad public launch also needs moderation and abuse controls.

## Verification — 2026-10-18 JST

- Full Vitest run: **613 tests passed across 84 files**, including 28 chat service/UI tests.
- Firebase emulator: **77 tests passed**, including 35 new chat security cases and 42 existing submission/judge/host permission cases. Both files run sequentially against loopback `demo-cognisor-permissions`, never production.
- TypeScript: passed. Changed-file ESLint: no errors; two existing DashboardLayout fast-refresh warnings.
- Vite production build: passed, with the existing large-bundle warning.
- Firebase rules dry-run: compiled successfully, with the existing unrelated submission-size type warning.
- In-app browser: `/community` rendered the signed-out page, three room controls, navigation and sign-in links correctly. Signed-in interaction is covered by mocked UI tests and the real emulator; no production messages, test users or judge marks were created or changed for testing.

Commands: `npx vitest run --maxWorkers=4`, `npm run test:rules` (Java 21 required), `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`.

Production rules were deployed to `hackathon-tokyo` using `contact@cognisorai.com` and read back successfully. The deployed source exactly matched the tested local rules (SHA-256 below, CRLF normalized to LF). Only `firestore:rules` was deployed; no records, indexes, Storage or hosting were changed.

- Release: `projects/hackathon-tokyo/releases/cloud.firestore`
- Ruleset: `projects/hackathon-tokyo/rulesets/4e1cfd5a-9769-49a5-b870-2918734ff281`
- Updated: `2026-10-17T17:50:33.374992Z` (18 October JST)
- SHA-256: `313b8e5c0bc92539d4a2f34f9d4562d05f03e4fc06de5af450c1d92c1d10ce6c`

Front-end changes have not been committed or pushed by this chat. Another chat is concurrently updating the feed/navigation; it has been notified to preserve the shared chat route and links.
