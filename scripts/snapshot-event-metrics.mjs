import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, terminate } from 'firebase/firestore';

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
  const published=new Map(events.docs.filter(row=>row.data().published===true).map(row=>[row.id,row.data()]));
  const hidden=new Set(events.docs.filter(row=>row.data().published!==true).map(row=>row.id));
  const ids=new Set(['impact-tokyo','impact-kyoto','impact-dhaka',...published.keys()].filter(id=>!hidden.has(id)));
  const reports=[];
  for(const id of [...ids].sort()){
    const members=users.docs.filter(row=>{
      const data=row.data();if(!['participant','participants'].includes(data.role))return false;
      const memberships=Array.isArray(data.hackathon_ids)?data.hackathon_ids:typeof data.hackathon_id==='string'?[data.hackathon_id]:[];
      return memberships.includes(id);
    });
    const entries=projects.docs.filter(row=>(row.data().hackathon_id||'impact-tokyo')===id);
    const approved=registrations.docs.filter(row=>row.data().hackathon_id===id&&row.data().approval_status==='approved');
    const publicEntries=publicProjects.docs.filter(row=>row.data().hackathon_id===id);
    const event=published.get(id);
    reports.push({eventId:id,...(event?{name:event.name,eventDate:event.eventDate,location:event.location,sourceUrl:event.sourceUrl||event.lumaUrl||null}:{}),
      portalParticipantAccounts:members.length,projectRecords:entries.length,
      namedProjectRecords:entries.filter(row=>typeof row.data().title==='string'&&row.data().title.trim()).length,
      videoProjectRecords:entries.filter(row=>typeof row.data().demo_video_url==='string'&&row.data().demo_video_url.trim()).length,
      publicProjectRecords:publicEntries.length,
      approvedImportedRegistrations:approved.length?approved.length:null,
    });
  }
  const payload={capturedAt:new Date().toISOString(),basis:'Read-only aggregate snapshot of published event records. Accounts and project records are not attendance or validated submissions; imported registrations may overlap accounts.',events:reports};
  const output=fileURLToPath(new URL('../src/data/eventMetricsSnapshot.json',import.meta.url));
  if(apply)writeFileSync(output,JSON.stringify(payload,null,2)+'\n');
  console.log(JSON.stringify({result:apply?'aggregate_snapshot_written':'dry_run_no_files_changed',...payload}));
}catch(error){console.log(JSON.stringify({result:'snapshot_failed',code:typeof error?.code==='string'?error.code:'configuration_or_validation_error'}));process.exitCode=1;}
finally{clearTimeout(timer);await Promise.allSettled([auth?signOut(auth):Promise.resolve(),db?terminate(db):Promise.resolve()]);if(app)await deleteApp(app);}
process.exit(process.exitCode??0);
