import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, terminate } from 'firebase/firestore';
import { buildEventMetricsSnapshot } from './lib/eventMetricsSnapshot.mjs';

// Produces public aggregates only. Raw accounts, registrations and project fields
// stay in memory and are never logged or written to disk. No cloud writes.
const apply=process.argv.includes('--write');
// The explicit flag records operator approval for the private-to-public data
// boundary. Neither --dry-run nor --write may read records without it.
const consent=process.argv.includes('--approved-public-aggregate-access');
if(!consent || process.argv.slice(2).some(arg=>!['--write','--dry-run','--approved-public-aggregate-access'].includes(arg)))throw new Error('Explicit approval for public aggregates is required');
let app,auth,db;
const timer=setTimeout(()=>process.exit(1),60_000);
try{
  const project=process.env.VITE_FIREBASE_PROJECT_ID;
  if(project!=='hackathon-tokyo')throw new Error('Unexpected project');
  app=initializeApp({apiKey:process.env.VITE_FIREBASE_API_KEY,authDomain:process.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:project,appId:process.env.VITE_FIREBASE_APP_ID},'public-event-metrics');
  auth=getAuth(app);db=getFirestore(app);
  await setPersistence(auth,inMemoryPersistence);
  await signInWithEmailAndPassword(auth,`portal-admin.${project}@firebase.app`,process.env.ADMIN_PASSWORD||process.env.VITE_ADMIN_PASSWORD);
  const admin=await getDoc(doc(db,'users',auth.currentUser.uid));
  if(!['admin','admins'].includes(admin.data()?.role))throw new Error('Actual admin required');
  const [events,users,projects,registrations,publicProjects]=await Promise.all([
    getDocs(collection(db,'hackathons')),getDocs(collection(db,'users')),getDocs(collection(db,'submissions')),
    getDocs(collection(db,'participant_registrations')),getDocs(collection(db,'public_projects')),
  ]);
  const payload=buildEventMetricsSnapshot({
    events:events.docs.map(row=>({id:row.id,data:row.data()})),users:users.docs.map(row=>row.data()),
    projects:projects.docs.map(row=>row.data()),registrations:registrations.docs.map(row=>row.data()),
    publicProjects:publicProjects.docs.map(row=>row.data()),
  },new Date().toISOString());
  const output=fileURLToPath(new URL('../src/data/eventMetricsSnapshot.json',import.meta.url));
  if(apply)writeFileSync(output,JSON.stringify(payload,null,2)+'\n');
  console.log(JSON.stringify({result:apply?'aggregate_snapshot_written':'dry_run_no_files_changed',...payload}));
}catch(error){console.log(JSON.stringify({result:'snapshot_failed',code:typeof error?.code==='string'?error.code:'configuration_or_validation_error'}));process.exitCode=1;}
finally{clearTimeout(timer);await Promise.allSettled([auth?signOut(auth):Promise.resolve(),db?terminate(db):Promise.resolve()]);if(app)await deleteApp(app);}
process.exit(process.exitCode??0);
