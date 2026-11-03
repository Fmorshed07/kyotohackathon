import type { HostedHackathon } from '@/lib/aiHackathons';
import { LUMA_CALENDAR_ARCHIVE } from '@/data/lumaCalendarArchive';
import { EVENT_REPORT_EVIDENCE, REPORT_CHECKED_AT } from '@/data/eventReportEvidence';
import snapshot from '@/data/eventMetricsSnapshot.json';

export type ReportSource = { id: string; platform: 'LinkedIn' | 'Instagram' | 'Luma' | 'Organizer' | 'Platform'; title: string; url: string; note: string; checkedAt: string };
export type ReportMetric = { id: string; label: string; value: number | null; unit?: string; qualifier?: string; definition: string; sourceLabel: string; sourceUrl?: string; asOf: string };
export type EventReportEvidence = {
  summary: string;
  sources: ReportSource[];
  metrics?: ReportMetric[];
  review: { strengths: string[]; improvements: string[] };
};
export type PublicEventReport = {
  eventId: string; eventName: string; eventDate: string; location: string; summary: string; checkedAt: string;
  metrics: ReportMetric[]; sources: ReportSource[]; review: EventReportEvidence['review'];
  coverage: { instagram: string; linkedin: string };
};

/** An illustrative planning scenario, never a replacement for a recorded figure. */
export function getThreefoldTarget(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const target = value * 3;
  return Number.isFinite(target) && target <= Number.MAX_SAFE_INTEGER ? target : null;
}

export function getEventReportHref(eventId: string) { return `/reports?event=${encodeURIComponent(eventId)}`; }

export function safeReportSourceUrl(value: string | undefined): string | undefined {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}

/** Archive aliases resolve to one report. Similar names alone never transfer statistics. */
export function getEventReportKey(event: Pick<HostedHackathon, 'id' | 'lumaUrl' | 'sourceUrl'>) {
  if (EVENT_REPORT_EVIDENCE[event.id]) return event.id;
  const urls = [event.lumaUrl, event.sourceUrl].map(value => safeReportSourceUrl(value)).filter(Boolean);
  const archive = LUMA_CALENDAR_ARCHIVE.find(entry => entry.portalIds?.includes(event.id) || event.id === `luma-${entry.slug}` || urls.some(value => {
    const url = new URL(value!);
    return /^(?:www\.)?(?:luma\.com|lu\.ma)$/.test(url.hostname) && url.pathname.replace(/^\/|\/$/g, '') === entry.slug;
  }));
  return archive?.portalIds?.[0] ?? (archive ? `luma-${archive.slug}` : event.id);
}

export type EventMetricSnapshotRow = {eventId: string; portalParticipantAccounts: number; projectRecords: number; namedProjectRecords: number; videoProjectRecords: number; publicProjectRecords: number; approvedImportedRegistrations: number | null};

export function resolveEventMetricSnapshotRow(rows: readonly EventMetricSnapshotRow[], eventId: string, canonicalId: string) {
  return rows.find(row => row.eventId === eventId) ?? rows.find(row => row.eventId === canonicalId);
}

function platformMetrics(eventId: string, canonicalId: string): ReportMetric[] {
  const row = resolveEventMetricSnapshotRow(snapshot.events as EventMetricSnapshotRow[], eventId, canonicalId);
  if (!row || !snapshot.capturedAt) return [];
  const fields: Array<[keyof EventMetricSnapshotRow, string, string]> = [
    ['portalParticipantAccounts', 'Portal participant accounts', 'Participant profile records with this event in their membership. These are not checked-in attendees or unique people across events.'],
    ['projectRecords', 'Project records', 'All saved project records assigned to this event, including incomplete drafts. This does not certify valid competition submissions.'],
    ['namedProjectRecords', 'Named project records', 'Saved project records with a nonblank title. These can still be incomplete and are not unique teams.'],
    ['videoProjectRecords', 'Records with video links', 'Saved project records with a nonblank demo-video URL. Links have not been independently validated.'],
    ['publicProjectRecords', 'Published project records', 'Records available to the public gallery for this event, excluding explicitly withdrawn entries.'],
    ['approvedImportedRegistrations', 'Approved imported registrations', 'Approved records in the imported-registration collection. Zero means no approved imported records; it does not measure all external signups. Registrations may overlap accounts and are not attendance.'],
  ];
  return fields.map(([key, label, definition]) => ({id:key,label,value:typeof row[key] === 'number' ? row[key] as number : null,definition,sourceLabel:'Platform aggregate snapshot',asOf:snapshot.capturedAt!,qualifier:'Snapshot'}));
}

export function getEventReport(event: HostedHackathon): PublicEventReport {
  const key = getEventReportKey(event);
  const evidence = EVENT_REPORT_EVIDENCE[key];
  const checkedAt = evidence ? REPORT_CHECKED_AT : '';
  const metrics = [...(evidence?.metrics ?? []), ...platformMetrics(event.id, key)];
  const unknowns: ReportMetric[] = [
    {id:'confirmed-attendance',label:'Verified attendance',value:null,definition:'A deduplicated check-in or attendance record has not been supplied for this report. Registration and Luma Went labels are reported separately.',sourceLabel:'Not independently verified',asOf:REPORT_CHECKED_AT},
    {id:'instagram-reach',label:'Instagram event reach',value:null,definition:'Account Insights or an event-specific analytics export is needed. Public access did not expose verified post-level metrics.',sourceLabel:'Instagram Insights required',asOf:REPORT_CHECKED_AT},
    {id:'linkedin-impressions',label:'LinkedIn event impressions',value:null,definition:'Post analytics are required. Followers, reactions on individual comments, and repeated reposts are not event impressions.',sourceLabel:'LinkedIn analytics required',asOf:REPORT_CHECKED_AT},
  ];
  const sources = (evidence?.sources ?? []).filter(source => safeReportSourceUrl(source.url));
  const official = safeReportSourceUrl(event.lumaUrl) ?? safeReportSourceUrl(event.sourceUrl);
  if (official && !sources.some(source => source.url === official)) sources.push({id:'event-listing',platform:/luma\.com|lu\.ma/.test(new URL(official).hostname)?'Luma':'Organizer',title:'Event listing from the catalog',url:official,note:'Linked from the public event catalog. This page was not independently verified for this report; no outcome count is inferred.',checkedAt:''});
  if (!sources.some(source => source.platform === 'Instagram')) sources.push({id:'instagram-profile',platform:'Instagram',title:'Cognisor AI on Instagram',url:'https://www.instagram.com/cognisor.ai/',note:'Official account. Event-level posts and engagement could not be verified through public access.',checkedAt:REPORT_CHECKED_AT});
  return {eventId:event.id,eventName:event.name,eventDate:event.eventDate,location:event.location,checkedAt,
    summary:evidence?.summary ?? 'The public programme is available. A verified outcome recap and event-level social analytics have not yet been published in this report.',
    metrics:[...metrics,...unknowns],sources,
    review:evidence?.review ?? {strengths:['A public event listing provides a starting point for the programme and participation details.'],improvements:['Publish an outcome recap with checked-in attendance, completed projects, and clearly dated Instagram and LinkedIn analytics.']},
    coverage:{instagram:'Event-specific likes, comments, views, reach, impressions, saves and shares could not be verified. Missing figures remain unavailable, not zero.',
      linkedin:sources.some(source=>source.platform==='LinkedIn')?'Organizer posts were reviewed for event announcements and outcomes. Event-wide impressions, reach, clicks and conversions are unavailable without account analytics.':'No event-specific organizer LinkedIn post was verified in this review. Post engagement and account analytics remain unavailable.'},
  };
}
