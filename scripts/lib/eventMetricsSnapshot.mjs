const DEFAULT_EVENT_IDS = ['impact-tokyo', 'impact-kyoto', 'impact-dhaka', 'elevenlabs-meetup-tokyo-2026', 'impact-osaka-2026'];
const validEventId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value.trim());
const projectEventId = data => validEventId(data.hackathon_id) ? data.hackathon_id : 'impact-tokyo';
const text = value => typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
const nonblank = value => Boolean(text(value).trim());
function hasVideo(value) {
  if (nonblank(value)) return true;
  return value && typeof value === 'object' && ['url', 'href', 'link', 'src'].some(key => nonblank(value[key]));
}

/** Only event IDs, aggregate counts and the capture time leave this function. */
export function buildEventMetricsSnapshot({events, users, projects, registrations, publicProjects}, capturedAt) {
  if (!Number.isFinite(Date.parse(capturedAt))) throw new Error('Invalid capture time');
  const visible = events.filter(event => event.data.published === true && validEventId(event.id));
  const hidden = new Set(events.filter(event => event.data.published !== true).map(event => event.id));
  const ids = [...new Set([...DEFAULT_EVENT_IDS, ...visible.map(event => event.id)])].filter(id => !hidden.has(id)).sort();
  const reports = ids.map(eventId => {
    const members = users.filter(user => {
      const role = typeof user.role === 'string' ? user.role.trim().toLowerCase() : '';
      if (!['participant', 'participants'].includes(role)) return false;
      const memberships = Array.isArray(user.hackathon_ids) ? user.hackathon_ids : [user.hackathon_id];
      return memberships.includes(eventId);
    });
    const entries = projects.filter(project => projectEventId(project) === eventId);
    return {
      eventId,
      portalParticipantAccounts: members.length,
      projectRecords: entries.length,
      namedProjectRecords: entries.filter(project => nonblank(project.title)).length,
      videoProjectRecords: entries.filter(project => hasVideo(project.demo_video_url)).length,
      publicProjectRecords: publicProjects.filter(project => project.public_preview_consent !== false && projectEventId(project) === eventId).length,
      approvedImportedRegistrations: registrations.filter(registration => registration.hackathon_id === eventId && registration.approval_status === 'approved').length,
    };
  });
  return {
    capturedAt,
    basis: 'Read-only aggregate snapshot for public events. Account memberships, saved project records and imported registrations are separate measures, may overlap, and do not certify attendance or valid competition submissions.',
    events: reports,
  };
}
