# Community networking channels

Open `/dashboard/community` from **Community chat** in the dashboard's Resources section. Chat uses the signed-in user's dashboard layout and is absent from the public header and footer. Signed-out visitors are redirected to sign-in with a return link; accounts without a portal role must complete signup. Old `/community` links redirect into the dashboard and preserve their channel, event query, and anchor.

- `?channel=general`: introductions, networking and discussion.
- `?channel=teams`: find teammates; share the event, idea, skills and availability.
- `?channel=judges`: general questions and guidance from judges and mentors, not private marks or judging notes.
- `?channel=announcements`: community updates posted by admins and readable by every registered member.

## Admin controls

In **Dashboard → Resources → Community chat**, admins can open **Manage channels** to create a channel, edit its name and description, group it under a section, and change its display order. A channel can be a discussion or an announcement space. Only admins can post to announcement channels.

Set **Posting status** to Open to accept posts, Closed to pause posting, or Archived to hide a channel from normal navigation while keeping its history and saved links available. Admins can select an archived channel in the manager and reopen it. Members cannot change channel settings. Admins can remove another member’s message after confirming the deletion; message bodies remain immutable.

All registered participants, judges, mentors, hosts and admins can read and post across events. Event enrollment and staff approval are not required to network. Signed-out visitors see a sign-in prompt, not messages. Anonymous Firebase users and accounts without a recognized portal role are denied. Pending staff can chat but display as `member`.

## Behavior

Messages arrive through a single bounded Firestore listener for the active room. The latest 100 are shown chronologically, with local search. Enter sends; Shift+Enter inserts a line break; Japanese IME composition does not submit. A failed send preserves the draft. Room/account changes reset the draft and unsubscribe from the previous room. Offline/cache-only connections disable sending until the server reconnects.

Messages contain display names, posting-time role labels, text and timestamps. The client never automatically copies account emails or private profile fields. Display names are user-chosen, not verified identities. Role labels are historical and grant no authority. HTTP(S) links open separately; message text is not interpreted as HTML.

Authors can permanently delete their own messages after confirmation; admins can also remove messages as moderators. Message editing, attachments, private messages and reporting are not included. Older messages remain stored but are not paginated in this version. A 3-second per-account cooldown applies across rooms, including announcements; this is not a global anti-abuse or multi-account spam solution. Channel settings arrive through a separate bounded listener. Cached or unavailable settings disable posting until the server reconnects.

## Data and rules

- `community_channels/{channelId}`: admin-managed metadata with exact schema `name`, `title`, `description`, `placeholder`, `section`, `type`, `status`, `order`, `updated_by`, `updated_at`. Channel IDs are safe path segments; metadata has type and length bounds on both create and update. Actor and server timestamp are checked. Channel documents cannot be deleted; archive them instead.
- `community_channels/{channelId}/messages/{autoId}`: exact schema of `user_id`, `author_name`, `author_role`, `body`, `created_at`. Body is nonblank and at most 2,000 characters; names are nonblank and at most 80 characters. Creation time must be server time. All updates are denied; deletion requires author ownership or a registered admin role.
- `community_chat_limits/{uid}`: `channel_id`, `message_id`, `last_sent_at`, atomically written with one new message. Pairing, ownership, server time and cooldown are validated; clients cannot delete or reset the limiter.
- The four built-in channels work without parent documents. Admin changes materialize an override; custom channels require a valid metadata document. Unknown or malformed channels are denied. Discovery and message queries are each bounded to 100 records. The timestamp query uses a standard single-field index; no composite index or Storage changes are needed.

The rules additions leave existing event, submission, judging and account permissions unchanged. See `community-chat-permissions-audit.json` for the scoped assessment and inherited risks. These are prototype rules, not an overall production security approval. Existing administrator bootstrap and role-assignment risks need a separate coordinated hardening change; broad public launch also needs moderation and abuse controls.

## Admin management verification — 2026-10-18 JST

- 87 focused app tests passed across channel services, the admin manager, chat lifecycle/moderation, dashboard redirects, and public navigation.
- All 133 Firestore emulator tests passed: 85 community cases and 48 existing event, submission, host and judge-invitation cases. Atomic close-plus-post attempts, announcement impersonation, invalid metadata and non-admin moderation are denied.
- TypeScript, changed-file ESLint and the production build passed. Local browser checks exercised channel creation, reopening, announcements and confirmed moderation using sample data only; the manager fits desktop and 375px mobile layouts.
- Only Firestore rules were released to `hackathon-tokyo`; the deployed rules were read back and matched the tested local source exactly. No production messages, channel documents or user records were created or changed for testing.

Current release: `projects/hackathon-tokyo/releases/cloud.firestore`.

- Ruleset: `projects/hackathon-tokyo/rulesets/d75ce896-b612-4a01-aa0a-53a9a9b5fcfb`
- Updated: `2026-10-17T19:15:34.118439Z` (18 October JST)
- LF-normalized SHA-256: `a3e1743fdacedebd64636cf03c49d27a17e2045f4884f82afa051f97f9d7d76f`

## Initial chat verification — 2026-10-18 JST

- Full Vitest run: **613 tests passed across 84 files**, including 28 chat service/UI tests.
- Firebase emulator: **77 tests passed**, including 35 new chat security cases and 42 existing submission/judge/host permission cases. Both files run sequentially against loopback `demo-cognisor-permissions`, never production.
- TypeScript: passed. Changed-file ESLint: no errors; two existing DashboardLayout fast-refresh warnings.
- Vite production build: passed, with the existing large-bundle warning.
- Firebase rules dry-run: compiled successfully, with the existing unrelated submission-size type warning.
- In-app browser: `/community` rendered the signed-out page, three room controls, navigation and sign-in links correctly. Signed-in interaction is covered by mocked UI tests and the real emulator; no production messages, test users or judge marks were created or changed for testing.

Commands: `npx vitest run --maxWorkers=4`, `npm run test:rules` (Java 21 required), `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`.

The initial rules were deployed to `hackathon-tokyo` using `contact@cognisorai.com` and read back successfully. That release was superseded by the admin management release above. Its source exactly matched the original tested rules (SHA-256 below, CRLF normalized to LF). Only `firestore:rules` was deployed; no records, indexes, Storage or hosting were changed.

- Release: `projects/hackathon-tokyo/releases/cloud.firestore`
- Ruleset: `projects/hackathon-tokyo/rulesets/4e1cfd5a-9769-49a5-b870-2918734ff281`
- Updated: `2026-10-17T17:50:33.374992Z` (18 October JST)
- SHA-256: `313b8e5c0bc92539d4a2f34f9d4562d05f03e4fc06de5af450c1d92c1d10ce6c`

Community chat remains within the signed-in dashboard. External Discord and Creators Circuit links are separate community destinations.
