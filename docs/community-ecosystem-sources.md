# Cognisor Japan ecosystem

Verified against the public source pages on 9 October 2026. The supplied Cerebral
Valley screenshots are composition references only: no competitor event photos,
partner claims, attendance figures, or financial metrics have been copied.

## Brand and partner artwork

- Source: https://www.cognisorai.com/ — “Sponsors & Partners / Powered by a Global Network”.
- All 51 distinct asset URLs observed in that section are represented, including
  alternate logos and Cognisor's own marks. This is **not** a claim of 51 unique partners.
- Upstream URLs follow `https://www.cognisorai.com/partners/Logos/{1..51}.png`.
  Every exact source URL is recorded in `src/data/communityPartners.ts`.
- Local WebP files preserve the artwork with trimmed margins and a maximum
  480 × 180 bounding box. The wall uses monochrome presentation with appropriate
  treatment of light- and dark-background source artwork.
- Labels come from visible lettering in the source artwork. Unidentified marks
  retain neutral, numbered source labels rather than guessed company names.
- The source's separate “Trusted tech” list is not repurposed as event sponsorship.
- The static directory exposes every asset. Repeated marquee copies are hidden
  from screen readers; motion plays by default and can be manually paused.

To refresh upstream assets, run `node scripts/sync-community-assets.mjs <sharp-entry-point>`
with an installed Sharp module. This is a maintenance script, not an app dependency.
It downloads only the numbered logo assets and Natural Earth geometry, and does
not write to Firebase or change event publication.

## Japan map and reported community figures

- Coastline: Natural Earth 1:50m admin-0 countries, Japan feature.
  https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
- Map data is public domain: https://www.naturalearthdata.com/about/terms-of-use/
- `src/data/japan-map.json` stores native vector paths; marker coordinates use the
  same projection in `projectJapanPoint`. No background image or map API is needed.
- Tokyo and Kyoto selections open city-filtered collections. Osaka opens Cognisor's
  official programme: https://www.cognisorai.com/events/impact-osaka-hackathon-2026
- 20+ events, 3,000+ builders, and 15+ startups are **company-reported community
  figures** from https://www.cognisorai.com/about, explicitly attributed in the UI.
  They are not live database counts or individual event attendance claims.

## Event collection and footer

`useCommunityEvents` preserves the public catalog's hidden/unpublished exclusions.
Saved organiser records supply posters, galleries, links, and metadata; approved
legacy catalog entries use the existing fallback behavior. A Kyoto stub without
a saved public page links to the directory instead of a nonexistent event page.

`/work` combines URL-backed search, city, type, organiser/partner, and time filters.
Valid timestamps determine upcoming/live/past state, including exact boundaries;
undated entries retain their saved status. Filters do not imply that every company
on the logo wall sponsors every event. Cards use actual event artwork where
available and a native text-based fallback otherwise, never invented event photos.

Footer destinations use existing local routes and verified Cognisor social/site
links. “Careers” is a document anchor so it also works when entered from `/work`.

## Public Luma past-event archive

Source: https://luma.com/cognisorailabs?period=past, checked 9 October 2026.
The complete public past list contained ten events. Each linked public event page
provided its title, cover, timezone, and start/end timestamps:

- https://luma.com/sorwsk0c — Future of Work in AI Era (24 September)
- https://luma.com/nextai-u4ix — ai& × Shipaton workshop (4 September)
- https://luma.com/e56k7x3v — AI Ideathon 2026 (13–15 August)
- https://luma.com/v8fcjqic — MERGE 2026 (8 August)
- https://luma.com/vxkrxn7e — AI Designathon @ MERGE (25 July–8 August, JST)
- https://luma.com/cmevass2 — Impact Kyoto (4 July)
- https://luma.com/mfebap7l — The Customer Value Sprint (17 April)
- https://luma.com/cnged4tc — Impact Dhaka (10 April, Asia/Dhaka)
- https://luma.com/2f3omvqa — Impact Tokyo (7 March)
- https://luma.com/dk5gq8b1 — Co-Creating Scalable Social Impact (5 March)

`src/data/lumaCalendarArchive.ts` is a verified snapshot, **not a live calendar
sync**. To refresh, inspect the complete public Past tab, verify each event page,
and update the entries and checked date. Summaries are concise paraphrases; source
titles and scheduled timestamps are preserved. The Designathon's description
mentions an 8 August final; the preview uses Luma's actual scheduled end timestamp
(8 August at 05:00 JST). Dhaka's description mentions a different start time; the
preview follows its structured schedule. Kyoto's exact venue is registration-gated
and is deliberately not included. No attendee, private venue, or registration data
is copied. Posters load lazily from the original public Luma CDN, with UI fallbacks.

The presentation-only merge deduplicates normalized Luma URLs, known portal IDs,
and exact normalized event titles with matching (or missing) start dates. Public organiser-authored data wins; missing
legacy dates and artwork are filled from the snapshot. This does not write to
Firebase or republish hidden portal documents. Kyoto/Tokyo source cards are
independent public Luma previews with external links, not restored portal routes.
Partner-hosted events are attributed to their source calendar/organiser rather
than claimed as exclusively organised by Cognisor. Upcoming calendar entries are
not imported into this past-only snapshot.

Home shows the newest three past events and a keyboard-accessible “Show all”
toggle. `/work?status=past` displays the complete filtered archive. The snapshot
remains available if the live event service fails; source cards never offer local
registration. No API key, proxy, iframe, or Luma account connection is required.
