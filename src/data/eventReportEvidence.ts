import type { EventReportEvidence, ReportMetric, ReportSource } from '@/lib/eventReports';

export const REPORT_CHECKED_AT = '2026-11-03';
const source = (id:string,platform:ReportSource['platform'],title:string,url:string,note:string):ReportSource => ({id,platform,title,url,note,checkedAt:REPORT_CHECKED_AT});
const metric = (id:string,label:string,value:number,definition:string,sourceUrl:string,qualifier?:string):ReportMetric => ({id,label,value,definition,sourceUrl,sourceLabel:new URL(sourceUrl).hostname.includes('linkedin')?'Organizer LinkedIn post':'Organizer Luma listing',asOf:REPORT_CHECKED_AT,...(qualifier?{qualifier}:{})});

export const EVENT_REPORT_EVIDENCE: Record<string,EventReportEvidence> = {
  'impact-tokyo': {
    summary:'A purpose-led AI buildathon in Tokyo, with an Antler venue and five published challenge areas. The public programme is documented; an independently checked attendance total is not available.',
    sources:[source('tokyo-listing','Luma','Impact Tokyo programme','https://luma.com/2f3omvqa','Primary organizer listing: venue, five challenge areas and judging criteria.'),source('tokyo-linkedin','LinkedIn','Organizer announcement','https://www.linkedin.com/posts/cognisor-ai_tokyo-hackathon-ai-activity-7429154138778763264-BrUq','Pre-event announcement. Promotional plans are not attendance or outcome statistics.')],
    metrics:[metric('challenge-areas','Published challenge areas',5,'Five problem tracks listed in the programme, including an open track. This is a programme count, not completed projects.','https://luma.com/2f3omvqa','Programme'),metric('linkedin-post-comments','Announcement comments',11,'Comment count in the public page title of one founder announcement, retrieved through a cached public view. It may lag the live post and is not total event engagement.','https://www.linkedin.com/posts/farhan-morshed_tokyo-hackathon-ai-activity-7429148830409039873-ksmg','One LinkedIn post · cached')],
    review:{strengths:['The brief connects AI prototypes to concrete social problems and publishes evaluation criteria.'],improvements:['Publish a dated outcome recap and checked-in attendance. Retire unsourced builder counters rather than treating them as attendance.']},
  },
  'impact-dhaka': {
    summary:'The organizer lists 10 April 2026 at BUET for an urban AI challenge, with coding and non-coding routes. No checked-in attendance or verified social totals were found.',
    sources:[source('dhaka-listing','Luma','Impact Dhaka programme','https://luma.com/cnged4tc','Organizer listing states April 10 at BUET, two participation tracks and four urban challenge areas.'),source('dhaka-linkedin','LinkedIn','Founder partnership announcement','https://www.linkedin.com/posts/farhan-morshed_hackathon-dhaka-bangladesh-activity-7445709440319852544-wEMn','Announces DEIED as an innovation partner. Partnership announcements do not establish attendance or final project counts.')],
    metrics:[metric('participation-tracks','Participation tracks',2,'Coding and open-innovation participation options advertised by the organizer.','https://luma.com/cnged4tc','Programme'),metric('challenge-areas','Published challenge areas',4,'Urban mobility, environmental sustainability, disaster resilience and public-service accessibility.','https://luma.com/cnged4tc','Programme')],
    review:{strengths:['A local problem brief and a non-coding entry route make the programme understandable to a wider range of builders.'],improvements:['The legacy portal date says TBA while Luma lists April 10. Use the organizer listing for the date and publish verified outcomes before claiming event impact.']},
  },
  'impact-kyoto': {
    summary:'An IVS side-event focused on practical agentic AI. Organizer posts identify winning projects, providing outcome evidence beyond the original programme.',
    sources:[source('kyoto-listing','Luma','Impact Kyoto programme','https://luma.com/cmevass2','Six published challenge areas and judging criteria; venue details remain controlled by the organizer.'),source('kyoto-winner','LinkedIn','Champion announcement','https://www.linkedin.com/posts/cognisor-ai_impactkyoto2026-impactkyoto-hackathon-activity-7482377785773142016-g7kr','Cognisor names Kurasu AI as champion. This is an organizer-reported award outcome.'),source('kyoto-recap','LinkedIn','Creators Circuit recap','https://www.linkedin.com/posts/creators-circuit_impactkyoto2026-ivskyoto-artificialintelligence-activity-7488213266582773761-PeQA','Community recap supports the one-day event narrative; it does not establish attendance or social reach.')],
    metrics:[metric('challenge-areas','Published challenge areas',6,'Six programme areas, including the open impact track; not six completed projects.','https://luma.com/cmevass2','Programme'),metric('linkedin-post-reactions','Judge-post reactions',15,'Reactions displayed on one organizer judge announcement in a cached public rendering. It may lag the live post; this is not event reach or unique people.','https://www.linkedin.com/posts/cognisor-ai_hackathon-cognisorai-japan-activity-7472879309561458688-RGc0','One LinkedIn post · cached'),metric('linkedin-post-comments','Judge-post comments',1,'Comments displayed on the same judge announcement in the cached public rendering. Not a count across all event posts.','https://www.linkedin.com/posts/cognisor-ai_hackathon-cognisorai-japan-activity-7472879309561458688-RGc0','One LinkedIn post · cached')],
    review:{strengths:['A public champion announcement connects the event brief to a named outcome: Kurasu AI.'],improvements:['Add a consolidated results page and a deduplicated attendance count. Keep social recap evidence separate from private analytics.']},
  },
  'ai-ideathon-2026-q9pxii': {
    summary:'A three-day online AI programme scheduled for 13–15 August. Luma publicly displays a Went label; it is reported using that label rather than as independently verified attendance.',
    sources:[source('ideathon-listing','Luma','AI Ideathon event listing','https://luma.com/e56k7x3v','Public listing displays 126 Went and a three-day programme. The platform label is not an independent check-in audit.'),source('ideathon-results','LinkedIn','Organizer winner announcement','https://www.linkedin.com/posts/cognisor-ai_aiideathon2026-cognisorai-cognisor-activity-7495011497845137408-kXTT','Organizer results announcement. Winner names and ranks are image-only in the public view, so they are not transcribed as verified text.')],
    metrics:[metric('luma-went','Luma “Went”',126,'The public Luma Went label observed on review. Its counting method has not been independently audited and it must not be added to portal accounts.','https://luma.com/e56k7x3v','Platform label'),metric('programme-days','Programme days',3,'August 13–15 as described by the organizer. Planned duration is not a participation total.','https://luma.com/e56k7x3v','Programme')],
    review:{strengths:['The programme combines problem discovery, workshops and prototyping across three days.'],improvements:['Reconcile inconsistent dates in the corporate registration widget and publish completion and attendance figures with a stated counting method.']},
  },
  'elevenlabs-meetup-tokyo-2026': {
    summary:'An ElevenLabs creative session at Mercari in Tokyo, with a scheduled 60-minute build. A direct organizer recap permalink and verified team or attendance counts were not available for this report.',
    sources:[source('elevenlabs-listing','Luma','ElevenLabs Tokyo programme','https://luma.com/1phsvlq5','Primary programme lists the Mercari venue and a 60-minute creative challenge.')],
    metrics:[metric('build-minutes','Creative challenge',60,'Scheduled creative build time, not the length of the whole meetup.','https://luma.com/1phsvlq5','Minutes')],
    review:{strengths:['The programme describes a concrete build activity and a time-boxed creative challenge.'],improvements:['Link a consolidated public project showcase and confirm attendance with check-ins. Keep reported teams separate from participant counts.']},
  },
  'impact-osaka-2026': {
    summary:'The current organizer listing places Impact Osaka online on 18 October, 17:00–21:00 JST. Older announcements use different dates and formats; the report follows the current listing.',
    sources:[source('osaka-listing','Luma','Current Impact Osaka listing','https://luma.com/jnwil7tv','Current date and online format. The main brief describes one AI-video challenge; older two-track prize copy remains lower on the page.'),source('osaka-old-post','LinkedIn','Earlier Osaka announcement','https://www.linkedin.com/posts/farhan-morshed_impact-osaka-activity-7510679117256892417-Rk1m','Earlier October 5 hybrid plan. Retained as change-history evidence, not the final schedule.'),source('osaka-expo','Organizer','Osaka startup side-event listing','https://osaka-startup.com/global-startup-crossroads-osaka/side-events/','Independent event-directory confirmation of October 18 and an online format.')],
    metrics:[metric('programme-hours','Scheduled programme',4,'17:00–21:00 JST on the current organizer listing. Duration does not establish attendance.','https://luma.com/jnwil7tv','Hours')],
    review:{strengths:['A current organizer listing and the Osaka side-event directory agree on the final date and online format.'],improvements:['Correct October 5 and October 22 promotions, and reconcile the one-challenge brief with older two-track prize text. Publish final outcomes and attendance separately from registrations.']},
  },
  'luma-dk5gq8b1': {
    summary:'A public panel about AI, open innovation and impact capital in Japan. Its Luma page exposes a Went count, which is retained as a platform label.',
    sources:[source('panel-listing','Luma','Social impact panel listing','https://luma.com/dk5gq8b1','Primary organizer listing displays 46 Went.')],
    metrics:[metric('luma-went','Luma “Went”',46,'Public Luma Went label observed at review; not an independently audited check-in total.','https://luma.com/dk5gq8b1','Platform label')],
    review:{strengths:['A public programme and Luma participation label provide a starting point for a transparent recap.'],improvements:['Add a session recap and audience feedback, with event-specific social analytics if available.']},
  },
  'luma-sorwsk0c': {
    summary:'A Future of Work discussion and PeerPortal launch at CIC Tokyo. The organizer’s announcement places it on September 24; Luma exposes a public Went count.',
    sources:[source('futurework-listing','Luma','Future of Work programme','https://luma.com/sorwsk0c','Public listing displays 66 Went and a programme combining a panel, launch, Q&A and networking.'),source('futurework-linkedin','LinkedIn','Founder event announcement','https://www.linkedin.com/posts/farhan-morshed_future-of-work-in-ai-era-activity-7507379013410144256-vleO','Organizer announcement identifies the September 24 event. This is not audience analytics.')],
    metrics:[metric('luma-went','Luma “Went”',66,'Public Luma Went label observed at review; not independently audited attendance.','https://luma.com/sorwsk0c','Platform label')],
    review:{strengths:['The programme links a career discussion to a product launch and time for audience questions.'],improvements:['Publish audience feedback and a recap separating panel engagement from product adoption.']},
  },
  'luma-nextai-u4ix': {
    summary:'An ai& × Shipaton workshop on September 4. Cognisor is listed as an operational collaborator; this report does not attribute sole organization to Cognisor.',
    sources:[source('shipaton-listing','Luma','ai& × Shipaton workshop','https://luma.com/nextai-u4ix','Public listing displays 47 Went and a three-hour build workshop.'),source('shipaton-linkedin','LinkedIn','Founder workshop announcement','https://www.linkedin.com/posts/farhan-morshed_proud-to-support-the-ai-shipaton-by-revenuecat-activity-7501525390121730048-jOuh','Organizer-side post confirms support for the September 4 workshop.')],
    metrics:[metric('luma-went','Luma “Went”',47,'Public Luma Went label observed at review; not independently audited attendance.','https://luma.com/nextai-u4ix','Platform label'),metric('programme-hours','Scheduled workshop',3,'18:00–21:00 build workshop; check-in begins earlier.','https://luma.com/nextai-u4ix','Hours')],
    review:{strengths:['A hands-on workshop gives participants a defined window to move an app toward publishing.'],improvements:['Publish completed build or shipment counts and attribute each partner’s role clearly.']},
  },
  'luma-v8fcjqic': {
    summary:'MERGE combines AI development and design in a hybrid conference. Its listed organizing partners are distinct from the Cognisor event team; forecast capacity is not used as an outcome.',
    sources:[source('merge-listing','Luma','MERGE conference listing','https://luma.com/v8fcjqic','Public listing displays 65 Went. Advertised expectations for offline and online audiences are forecasts, not actual counts.')],
    metrics:[metric('luma-went','Luma “Went”',65,'Public Luma Went label observed at review. Overlap with the associated Designathon audience is unknown.','https://luma.com/v8fcjqic','Platform label')],
    review:{strengths:['The programme connects product development, design and a hybrid community format.'],improvements:['Report actual audience counts separately from forecasts, and avoid adding Designathon participants as unique additional attendees.']},
  },
  'luma-vxkrxn7e': {
    summary:'The AI Designathon is connected to MERGE, with a July 25 kickoff, July 31 submission deadline and August 8 final described in the programme.',
    sources:[source('designathon-listing','Luma','AI Designathon programme','https://luma.com/vxkrxn7e','Public listing displays 52 Went and three categories. Cognisor is identified as a co-host.')],
    metrics:[metric('luma-went','Luma “Went”',52,'Public Luma Went label observed at review. It is not a completed submission count and may overlap MERGE participants.','https://luma.com/vxkrxn7e','Platform label'),metric('programme-categories','Published categories',3,'Three advertised challenge categories, not three confirmed winning projects.','https://luma.com/vxkrxn7e','Programme')],
    review:{strengths:['The programme provides categories and a defined build-to-final sequence.'],improvements:['Confirm the final-session timing across the archive and programme, and publish final submission and award outcomes.']},
  },
  'luma-mfebap7l': {
    summary:'The Customer Value Sprint was announced for April 17 at Hosei University. The organizer’s LinkedIn post supports the two-hour session; the public Luma page could not be verified in this review.',
    sources:[source('customer-linkedin','LinkedIn','Customer Value Sprint announcement','https://www.linkedin.com/posts/farhan-morshed_most-people-are-building-faster-than-ever-activity-7449213130909462528-ILKe','Organizer announcement identifies April 17, 17:00–19:00, at Hosei University.')],
    metrics:[{...metric('programme-hours','Scheduled sprint',2,'The organizer announcement schedules a 17:00–19:00 workshop. This is planned duration, not an outcome.','https://www.linkedin.com/posts/farhan-morshed_most-people-are-building-faster-than-ever-activity-7449213130909462528-ILKe','Hours')}],
    review:{strengths:['Customer discovery and validation are clearly positioned before rapid building.'],improvements:['Add a session recap, verified participation count and the number of ideas tested with customers.']},
  },
};
