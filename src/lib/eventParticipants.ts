import { collection, limit, onSnapshot, query, type Firestore } from 'firebase/firestore';
import { isHackathonId } from '@/lib/hackathons';

export type EventParticipant = {
  id: string;
  displayName: string;
  attendanceMode: 'online' | 'onsite' | 'unspecified';
};

export function parseEventParticipant(id: string, data: Record<string, unknown>): EventParticipant | null {
  const allowed = ['display_name', 'attendance_mode', 'approval_status', 'source'];
  if (Object.keys(data).some(key => !allowed.includes(key)) ||
      typeof data.display_name !== 'string' || !data.display_name.trim() ||
      data.display_name.length > 120 || data.display_name.includes('@') ||
      data.approval_status !== 'approved' || data.source !== 'luma' ||
      !['online', 'onsite', 'unspecified'].includes(String(data.attendance_mode))) return null;
  return { id, displayName: data.display_name.trim(), attendanceMode: data.attendance_mode as EventParticipant['attendanceMode'] };
}

/** This projection contains no contact details and is readable only by assigned approved staff. */
export function subscribeToEventParticipants(
  db: Firestore,
  hackathonId: string,
  onRows: (rows: EventParticipant[]) => void,
  onError: (error: Error) => void,
): () => void {
  if (!isHackathonId(hackathonId)) { onError(new Error('Select a valid hackathon.')); return () => {}; }
  return onSnapshot(query(collection(db, 'hackathons', hackathonId, 'participant_roster'), limit(500)), snapshot => {
    const rows = snapshot.docs.map(doc => parseEventParticipant(doc.id, doc.data())).filter((row): row is EventParticipant => row !== null);
    onRows(rows.sort((left, right) => left.displayName.localeCompare(right.displayName) || left.id.localeCompare(right.id)));
  }, () => onError(new Error('The participant roster could not be loaded. Please try again.')));
}
