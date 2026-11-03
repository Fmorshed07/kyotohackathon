# Public event reports

Public reports are available at `/reports?event=<public-catalog-id>` and at
`#report` within local event pages. The index uses the existing public community
catalog, including its archive identity merge. It does not restore hidden event
documents or fetch private collections in the browser.

`src/data/eventReportEvidence.ts` contains reviewed public source summaries and
per-metric definitions, direct URLs and observation dates. Sources were checked
on 3 November 2026 JST. Public search renders may be cached. LinkedIn reactions
and comments are explicitly one-post cached snapshots, not live event totals.

Luma's `Went` labels retain that name; they do not establish independently
verified attendance. Programme duration, categories and challenge areas are
programme measures. Registration, accounts, attendees and completed projects
are distinct. Do not add overlapping event audiences or reposts into a unique
people total. No engagement rates are computed without a valid denominator.

The Instagram account was verified through the organizer website. Public
access did not provide verifiable event-level posts or engagement. Reach,
impressions, saves, clicks, watch time and conversions remain unavailable.
Missing evidence is represented by null, never an invented zero.

The editorial review flags schedule conflicts and gaps in outcomes. Unsupported
legacy builder counters were removed from hackathon cards. Reviewed evidence
exists for all 12 events currently visible in the public community calendar;
new events receive an honest evidence-availability fallback.

## Optional platform aggregates

On 3 November 2026 JST the user explicitly approved admin access to count private
registrations, participant accounts and project records, and publish only the
per-event totals. `eventMetricsSnapshot.json` contains the approved read-only
snapshot. It includes only event IDs, counts, capture time and the counting basis.
No names, contacts, project details or individual marks are published.

`scripts/snapshot-event-metrics.mjs` requires an explicit approval flag before
even a dry run:

```powershell
node --env-file=.env.local scripts/snapshot-event-metrics.mjs --approved-public-aggregate-access --write
```

The user's authorization covers this aggregate-only boundary. The script uses
the existing admin, performs no cloud writes, and outputs only event IDs and
counts. Review each snapshot before release. The helper preserves explicit
empty membership lists, uses the portal's legacy Tokyo mapping, excludes
withdrawn public-project records, and counts legacy video-link formats.
Imported-registration zero means no approved records in that collection, not
zero external signups. These counts do not certify attendance or valid
competition submissions. Measured figures are never multiplied into targets.

Review screenshots are stored under
`F:/AI Projects/kyotohackathon-reports/review-assets/`. The existing source
checkout remains in its original location; no existing project was moved.
