import { createHash } from 'node:crypto';

/** Small RFC 4180 reader. Never logs the uploaded contact data. */
export function parseCsv(source) {
  if (typeof source !== 'string' || source.length > 5_000_000) throw new Error('invalid_csv_size');
  const text = source.replace(/^\uFEFF/, '');
  const rows = []; let row = []; let field = ''; let quoted = false; let closed = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index++; }
        else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === '"') {
      if (field || closed) throw new Error('invalid_csv_quote');
      quoted = true;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field); field = ''; closed = false;
      if (char !== ',') {
        if (row.some(value => value.length)) rows.push(row);
        row = [];
        if (char === '\r' && text[index + 1] === '\n') index++;
      }
    } else {
      if (closed) throw new Error('invalid_csv_after_quote');
      field += char;
    }
  }
  if (quoted) throw new Error('unclosed_csv_quote');
  row.push(field);
  if (row.some(value => value.length)) rows.push(row);
  const headers = rows.shift()?.map(value => value.trim());
  if (!headers?.length || new Set(headers).size !== headers.length) throw new Error('invalid_csv_headers');
  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`invalid_csv_columns_row_${index + 2}`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

export function registrationId(eventId, email) {
  return createHash('sha256').update(`luma\0${eventId}\0${email.trim().toLowerCase()}`).digest('hex');
}

export function prepareApprovedParticipants(source, eventId) {
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(eventId)) throw new Error('invalid_event_id');
  const rows = parseCsv(source);
  if (!rows.length || rows.length > 1000) throw new Error('invalid_guest_count');
  const guests = []; const emails = new Set(); const guestIds = new Set(); let skipped = 0;
  for (const [index, row] of rows.entries()) {
    if (!['guest_id', 'email', 'name', 'approval_status'].every(key => key in row)) throw new Error('missing_required_columns');
    if (row.approval_status.trim().toLowerCase() !== 'approved') { skipped++; continue; }
    const email = row.email.trim().toLowerCase();
    const name = row.name.trim().replace(/\s+/g, ' ');
    const guestId = row.guest_id.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !name || name.length > 120 || name.includes('@') || !guestId || guestId.length > 128) {
      throw new Error(`invalid_approved_guest_row_${index + 2}`);
    }
    if (emails.has(email) || guestIds.has(guestId)) throw new Error(`duplicate_approved_guest_row_${index + 2}`);
    emails.add(email); guestIds.add(guestId);
    const mode = (row['How can you join ?'] ?? '').trim().toLowerCase();
    const registeredAt = (row.created_at ?? '').trim();
    if (registeredAt.length > 80) throw new Error(`invalid_registration_date_row_${index + 2}`);
    guests.push({
      id: registrationId(eventId, email), email, displayName: name, guestId,
      attendanceMode: mode === 'online' ? 'online' : mode === 'offline' || mode === 'onsite' ? 'onsite' : 'unspecified',
      registeredAt,
    });
  }
  return { guests, sourceRows: rows.length, skipped };
}

export function safeRosterRecord(guest) {
  return { display_name: guest.displayName, attendance_mode: guest.attendanceMode,
    approval_status: 'approved', source: 'luma' };
}

/** Existing event access and its primary event are never removed by an import. */
export function participantMembershipPatch(user, eventId) {
  if (!['participant', 'participants'].includes(user.role)) return {};
  const ids = Array.isArray(user.hackathon_ids)
    ? user.hackathon_ids.filter(value => typeof value === 'string' && value.trim())
    : [];
  const primary = typeof user.hackathon_id === 'string' ? user.hackathon_id.trim() : '';
  const merged = [...new Set([...ids, ...(primary ? [primary] : []), eventId])];
  const patch = {};
  if (!Array.isArray(user.hackathon_ids) || merged.length !== user.hackathon_ids.length || merged.some((id, index) => id !== user.hackathon_ids[index])) patch.hackathon_ids = merged;
  if (!primary) patch.hackathon_id = eventId;
  return patch;
}
