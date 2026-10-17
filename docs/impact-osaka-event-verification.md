# Impact Osaka verification

Updated 18 October 2026 (Japan time) in `D:/AI AND PSD/kyotohackathon`, based on commit `674c108c5e944200a30888f0086b14d780d50fc0`.

This report replaces the older verification claims supplied with the patch. Results below describe this checkout and this verification run.

## Event and format

- Canonical event ID: `impact-osaka-2026`.
- Preview: http://127.0.0.1:8086/events/impact-osaka-2026
- Source: https://luma.com/jnwil7tv, checked 18 October 2026 JST.
- The user confirmed **one AI-video challenge**, following the updated main description, rather than the older two-track prize copy.
- Schedule: **18 October 2026, 17:00–21:00 JST**, online via Discord. The page includes the five programme slots, Luma registration and calendar times.
- A recommended 60–120 second video addresses an Osaka/Kansai problem and uses the ElevenLabs API meaningfully. Four subject areas are inspirations, not separate competition tracks.
- The five judging criteria follow the updated description. Luma gives no numeric weights; equal 20-point values are editable platform defaults. Existing saved rubrics are preserved.
- The page retains the advertised three-month Pro/Scale rewards without assigning them to the obsolete tracks. Final award categories remain subject to the organisers' announcement.
- Artwork from the supplied patch is retained unchanged and served locally. It still contains the earlier autonomous-agents title. Current page text follows the selected AI-video format.

## Implemented behavior

- Osaka appears in the home event catalog, event page, participant enrollment and admin catalog, including before a cloud record exists.
- Participants automatically save under `ai-video`. There is no single-track choice to block saving. Older local drafts are restored without losing edits and normalized to the current challenge.
- Judges see all Osaka submissions, including older/unassigned records. The single-track event has no track filter. Track labels remain available in admin/scoring views and exports.
- Imported lifecycle switches at the event start/end, respects explicit organiser pause/close/reopen, and blocks normal participant saves after the end or when unpublished.
- Admin actions materialize a complete event and missing rubric atomically. An additional regression fix preserves unpublished bundled events when the admin catalog falls back to a published-only query.
- Firestore rules enforce past/unpublished/automatic-end gates for participant writes while allowing the separate judge-mark workflow. Missing legacy event documents retain their previous rule behavior.
- The shared publisher preserves existing event and rubric edits and rejects a dry run combined with lifecycle mutation.
- Browser verification caught event links retaining the home page's scroll position. Event pages now open at the top while preserving explicit section anchors; the 22 affected page tests passed after this follow-up fix, followed by TypeScript, changed-file lint and a fresh production build.

## Verification performed in this run

- Account/auth/gallery/judge regression subset: **120 tests passed in 15 files**.
- Focused Osaka, ElevenLabs and participant/judge cases: **38 tests passed** before the full suite.
- Full application suite: **514 tests passed across 77 files**, zero failures (`maxWorkers=2`, 189.29 seconds).
- Firestore permissions: **42 tests passed in 3 suites**, zero failed or skipped. Used local Standard emulator 1.22.0 with SHA256-verified official Temurin Java 21.0.12.1. The emulator was stopped after testing; no real participant or judge accounts were created.
- Osaka and ElevenLabs publisher `--validate`: passed without cloud changes.
- Publisher `--dry-run --sync-auto-lifecycle`: rejected before cloud access, as intended.
- Read-only production check: the configured existing administrator could read all four event records. No Osaka match existed, including unpublished records. The Osaka dry run returned `ready_to_create_no_cloud_changes`.

- App TypeScript: passed without errors.
- Repository ESLint: zero errors, 19 warnings.
- Production build: passed; existing large-bundle and outdated Browserslist warnings remain.
- Browser integration found that the deployed public rules reject a missing Osaka document. The client treats that denial as hidden, so the production event record must be materialized to show the new catalog entry with the real configuration. Mocked missing-document tests alone did not cover this deployment dependency.

## Live verification and release

- Event implementation commit `c51786e` was pushed to `main`. Both existing Vercel production projects (`impactkyotohackathon` and `impacthackathon`) deployed successfully.
- Canonical cover and banner returned HTTP 200 with the correct image content types/signatures and SHA-256 hashes matching the committed files.
- The existing administrator created the Osaka event and initial rubric transactionally. The publisher returned `published_and_verified`; no existing event, account or competition marks were overwritten.
- Public page: https://impactkyoto.cognisorai.com/events/impact-osaka-2026
- The real browser verified the page at 1280 px and 390 px: correct challenge/date, all three registration links point to Luma, no broken images, no horizontal overflow and no captured page errors. Temporary mobile viewport settings were reset.
- The home card was checked against production data, including navigation into the event. The final local follow-up build opens the event at scroll position 0.
- The public participant signup route opens with Participant selected. Registration/onboarding writes were tested locally, without creating production test accounts.

## Remaining deployment limits

Pre-release verification used read-only production access. Application changes and artwork must be released before creating the production event/rubric record; publishing the record first would point the deployed old app at artwork paths it does not yet contain. Production rule deployment is a separate release step. No real test accounts, email or scoring writes are needed.

The server deadline check needs both the published event's `sourceLifecycleAutomatic: true` and numeric `endAtMs`, plus the updated deployed rules. The existing Firebase CLI account received HTTP 403 when listing releases and reading the deployed Firestore release. Production rules could not be compared safely and **were not deployed**. The old local rules ignore the automatic deadline; a successful event creation alone does not prove backend enforcement. Normal client saves use the event end (21:00 JST); there is no separate enforced 19:30 deadline for the programme's build-and-submit slot.

The supplied audit's pre-existing administrator-bootstrap, event-isolation, private-data and score-value-validation findings remain outside this event change. Passing these functional tests is not a complete production security sign-off. See `impact-osaka-permissions-audit.json` for details.

## Reproduction

```sh
npm test -- --maxWorkers=2
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm run build
node --experimental-strip-types scripts/publish-imported-event.mjs --event=impact-osaka-2026 --validate
node --experimental-strip-types scripts/publish-elevenlabs-meetup.mjs --validate
node --experimental-strip-types --env-file=.env.local scripts/publish-imported-event.mjs --event=impact-osaka-2026 --dry-run
```

`npm run test:rules` requires Java 21+. This machine's npm cache lock prevented the pinned Firebase CLI wrapper from starting, so verification launched the cached Firestore emulator JAR directly with the same `firestore.rules`, demo project and test file. No global Java installation or production deployment was required.
