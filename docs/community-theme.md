# Minimal community theme

The site uses one restrained visual language across the homepage, event pages,
project/feed pages, resources, authentication, and all dashboard roles:

- Plus Jakarta Sans display and body type, shared with the homepage through `--font-sans`.
- Deep navy backgrounds, flat panels, subtle blue borders, and restrained blue actions.
- Consistent controls, visible keyboard focus, wrapping tabs, and mobile-safe inputs.
- Actual event posters, project media, and logos remain content, not decoration.

## Background and motion

The Japan ecosystem section uses native SVG coastline geometry, blue city beacons,
and animated route lines. The partner wall is pausable and has a complete static
directory. Both play by default, pause off screen or when the tab is hidden, and
provide working manual pause/resume controls. `CommunityAtmosphere` uses native CSS gradients and border contours in the
event spotlight. Other pages use the static `site-canvas`. The separately developed
globe intro remains independent of these sections.

The homepage renders immediately, without an artificial loading intro. Feature links
are stable and directly navigable instead of auto-rotating animated mockups. Scroll
reveals and small interaction transitions remain. At the owner's explicit request,
decorative motion is full by default (`MotionConfig reducedMotion="never"`),
independent of the OS setting. The automatic reduced-motion CSS overrides and
disabled “Reduced motion” buttons are removed. This does not change the OS setting
or the separate project-feed video autoplay preference. The globe opens directly
in the full scroll journey; pause/resume never changes its layout or scroll position.

## Implementation

- `src/index.css`: semantic theme tokens and shared dashboard/panel utilities.
- `src/minimal-theme.css`: shared typography, homepage rhythm, and feature links.
- `src/components/projects/project-feed.css`: feed and video-page spacing, surfaces, and typography.
- `src/lib/projectFeedEvents.ts`: date-aware ordering shared by the feed and video event filters. Ongoing events come first, then upcoming events, then past events; current published events remain discoverable before their first project. The default feed order follows that event order, with newest submissions first within each event.
- `src/components/community-atmosphere.css`: native CSS ambient motion.
- Shared UI components: buttons, cards, tabs, inputs, and textareas.
- `src/components/ecosystem/`: Japan map, partner wall, event fan, and complete footer.
- `src/pages/CommunityWorkPage.tsx`: searchable, URL-filtered public event collection.
- `docs/community-ecosystem-sources.md`: partner, map, and company-figure provenance.

The default Horizon event typography also uses the shared font; explicitly selected
alternate event fonts and accent colors remain available. Authentication, event date
classification, Luma importing, ticketing, and publication workflows are unchanged.
