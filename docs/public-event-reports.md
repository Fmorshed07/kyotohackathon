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

The checked-in `eventMetricsSnapshot.json` is intentionally empty. Automatic
approval review rejected extracting private records and publishing aggregates
without specific user authorization. No private registrations, user profiles,
submissions or scores were accessed for this reporting change.

`scripts/snapshot-event-metrics.mjs` is prepared for a separately authorized
operator run. It requires an explicit approval flag before even a dry run:

```powershell
node --env-file=.env.local scripts/snapshot-event-metrics.mjs --approved-public-aggregate-access --write
```

Do not run this until the user explicitly approves private-record aggregation
and public disclosure of the per-event totals. It uses the existing admin,
performs no cloud writes, and outputs only public event metadata and counts.
An approved snapshot must be reviewed before release. It never publishes names,
contacts, private project details or individual marks. These counts do not
certify attendance or valid competition submissions.

Review screenshots are stored under
`F:/AI Projects/kyotohackathon-reports/review-assets/`. The existing source
checkout remains in its original location; no existing project was moved.
