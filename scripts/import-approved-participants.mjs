import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, runTransaction, serverTimestamp, terminate } from 'firebase/firestore';
import { prepareApprovedParticipants, safeRosterRecord, participantMembershipPatch } from './lib/approvedParticipantImport.mjs';

// Run with --env-file=.env.local. The CSV stays outside the repository. No
// passwords, Auth accounts, notifications, emails, or submissions are created.
// Default is a read-only plan. --apply explicitly enables atomic guest imports.
const EVENT_ID = 'impact-osaka-2026';
const PROJECT_ID = 'hackathon-tokyo';
const args = process.argv.slice(2);
const fileArg = args.find(arg => arg.startsWith('--file='));
const apply = args.includes('--apply');
let app; let auth; let db;
const timer = setTimeout(() => { console.log(JSON.stringify({result:'timed_out_rerun_dry_run_to_verify',event:EVENT_ID})); process.exit(1); }, 240_000);
const print = value => console.log(JSON.stringify(value));

function sameFields(left, right, excluded = []) {
  const clean = value => Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.includes(key)).sort(([a],[b]) => a.localeCompare(b)));
  return JSON.stringify(clean(left)) === JSON.stringify(clean(right));
}

async function main() {
  if (!fileArg || args.some(arg => arg !== fileArg && !['--apply','--dry-run'].includes(arg)) || (apply && args.includes('--dry-run'))) throw new Error('invalid_arguments');
  const source = readFileSync(fileArg.slice('--file='.length), 'utf8');
  const plan = prepareApprovedParticipants(source, EVENT_ID);
  if (!plan.guests.length) throw new Error('no_approved_guests');
  if (process.env.VITE_FIREBASE_PROJECT_ID !== PROJECT_ID) throw new Error('unexpected_firebase_project');
  app = initializeApp({apiKey:process.env.VITE_FIREBASE_API_KEY,authDomain:process.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:PROJECT_ID,appId:process.env.VITE_FIREBASE_APP_ID}, 'approved-participant-import');
  auth = getAuth(app); db = getFirestore(app);
  await setPersistence(auth,inMemoryPersistence);
  await signInWithEmailAndPassword(auth, `portal-admin.${PROJECT_ID}@firebase.app`, process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD);
  const [event, admin, users] = await Promise.all([getDoc(doc(db,'hackathons',EVENT_ID)), getDoc(doc(db,'users',auth.currentUser.uid)),getDocs(collection(db,'users'))]);
  if (!event.exists() || event.data().sourceUrl !== 'https://luma.com/jnwil7tv') throw new Error('event_source_mismatch');
  if (!['admin','admins'].includes(admin.data()?.role)) throw new Error('actual_admin_role_required');
  const byEmail = new Map();
  for(const user of users.docs) {
    const email = typeof user.data().email === 'string' ? user.data().email.trim().toLowerCase() : '';
    if (!email) continue;
    if (!byEmail.has(email)) byEmail.set(email,[]);
    byEmail.get(email).push(user);
  }
  if (plan.guests.some(guest => (byEmail.get(guest.email)?.length ?? 0) > 1)) throw new Error('ambiguous_portal_account_match');
  let matchedParticipants=0; let otherRoles=0;
  for(const guest of plan.guests) {
    const matched=byEmail.get(guest.email)?.[0];
    if(matched) {
      if(['participant','participants'].includes(matched.data().role)) matchedParticipants++;
      else otherRoles++;
    }
  }
  print({result:apply?'validated_ready_to_import':'dry_run_no_changes',event:EVENT_ID,sourceRows:plan.sourceRows,approvedGuests:plan.guests.length,skippedUnapproved:plan.skipped,matchedParticipants,existingOtherRolesPreserved:otherRoles,newGuestRegistrations:plan.guests.length-matchedParticipants-otherRoles,contactDetails:'private',judgeRoster:'names_and_participation_mode_only'});
  if (!apply) return;
  let changedRegistrations=0; let changedRoster=0; let enrolledAccounts=0; let unchanged=0;
  for(const guest of plan.guests) {
    const registrationRef=doc(db,'participant_registrations',guest.id);
    const rosterRef=doc(db,'hackathons',EVENT_ID,'participant_roster',guest.id);
    const matched=byEmail.get(guest.email)?.[0];
    const outcome=await runTransaction(db,async transaction => {
      const registration=await transaction.get(registrationRef);
      const roster=await transaction.get(rosterRef);
      const user=matched ? await transaction.get(matched.ref) : null;
      if(registration.exists() && (registration.data().email !== guest.email || registration.data().hackathon_id !== EVENT_ID || registration.data().source !== 'luma' || registration.data().source_guest_id !== guest.guestId)) throw new Error('registration_identity_conflict');
      if(user?.exists() && user.data().email?.trim().toLowerCase() !== guest.email) throw new Error('account_changed_during_import');
      const privateData={hackathon_id:EVENT_ID,email:guest.email,display_name:guest.displayName,attendance_mode:guest.attendanceMode,approval_status:'approved',source:'luma',source_guest_id:guest.guestId,registered_at:guest.registeredAt,matched_user_id:user?.exists()?user.id:null};
      const safeData=safeRosterRecord(guest);
      const privateChanged=!registration.exists() || !sameFields(registration.data(),privateData,['imported_at']);
      const rosterChanged=!roster.exists() || !sameFields(roster.data(),safeData);
      const userPatch=user?.exists()?participantMembershipPatch(user.data(),EVENT_ID):{};
      if(privateChanged) transaction.set(registrationRef,{...privateData,imported_at:serverTimestamp()});
      if(rosterChanged) transaction.set(rosterRef,safeData);
      if(Object.keys(userPatch).length) transaction.update(matched.ref,userPatch);
      return {privateChanged,rosterChanged,enrolled:Object.keys(userPatch).length>0};
    });
    changedRegistrations+=Number(outcome.privateChanged); changedRoster+=Number(outcome.rosterChanged); enrolledAccounts+=Number(outcome.enrolled);
    if(!outcome.privateChanged&&!outcome.rosterChanged&&!outcome.enrolled)unchanged++;
  }
  // Check the persisted records; report counts only, never guest names/emails.
  let verified=0;
  for(const guest of plan.guests) {
    const [registration,roster]=await Promise.all([getDoc(doc(db,'participant_registrations',guest.id)),getDoc(doc(db,'hackathons',EVENT_ID,'participant_roster',guest.id))]);
    if(!registration.exists() || registration.data().email!==guest.email || !roster.exists() || !sameFields(roster.data(),safeRosterRecord(guest)) || JSON.stringify(roster.data()).includes('@')) throw new Error('readback_verification_failed');
    verified++;
  }
  print({result:'imported_and_readback_verified',event:EVENT_ID,verifiedParticipants:verified,changedRegistrations,changedRoster,enrolledAccounts,unchanged,noEmailsSent:true,noAuthAccountsCreated:true});
}

try { await main(); }
catch(error) {
  const safeCodes=['invalid_arguments','no_approved_guests','unexpected_firebase_project','event_source_mismatch','actual_admin_role_required','ambiguous_portal_account_match','registration_identity_conflict','account_changed_during_import','readback_verification_failed'];
  const code=safeCodes.includes(error?.message)?error.message:typeof error?.code==='string'&&/^[a-z/-]+$/.test(error.code)?error.code:'validation_or_import_failed';
  print({result:'failed',code,event:EVENT_ID});process.exitCode=1;
} finally {
  clearTimeout(timer);
  await Promise.allSettled([auth?signOut(auth):Promise.resolve(),db?terminate(db):Promise.resolve()]);
  if(app) await deleteApp(app);
}
process.exit(process.exitCode??0);
