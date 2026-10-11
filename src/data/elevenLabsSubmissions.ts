/** Public project details from Meetup Fina.xlsx, elevenlabs-meetup-creative-chal!B2:F18.
 * Imported 11 October 2026. Repeated submissions use the latest project details.
 * The filename-only BEYOND N2 entry is omitted at the requester's direction.
 * Contact emails, review status, internal notes and judging scores are excluded.
 * The separately requested winners use the explicit Rank column (H), not score sorting.
 */
export type ElevenLabsSubmission = {
  id: string;
  title: string;
  participantName: string;
  additionalTeamMembers: string[];
  description: string;
  toolsUsed: string;
  submissionType: "Individual" | "Team";
  videoUrl: string | null;
  additionalLinks: { label: string; url: string; note?: string }[];
  missingVideoFilename?: string;
  sourceRows: number[];
  previewStatus?: "unavailable";
  previewNote?: string;
};

export const ELEVENLABS_SUBMISSIONS: ElevenLabsSubmission[] = [
  {
    "id": "elevenlabs-tokyo-2",
    "title": "Japan Career Video",
    "participantName": "Preston Lau",
    "additionalTeamMembers": [],
    "description": "Japan Career Video",
    "toolsUsed": "Voice Cloning / Voice Design",
    "submissionType": "Individual",
    "videoUrl": "https://youtube.com/shorts/FSTDBS5I_YA?si=FmlyOCvMOl3NCt1I",
    "additionalLinks": [],
    "sourceRows": [
      2
    ],
    "previewStatus": "unavailable",
    "previewNote": "This submitted YouTube video is currently unavailable. You can still open the original link below."
  },
  {
    "id": "elevenlabs-tokyo-3",
    "title": "New Grad Group Discussion Helper",
    "participantName": "Mark Oguro",
    "additionalTeamMembers": [],
    "description": "Different from other countries, Japan has a group discussion for new grad hiring. however, it's hard to practice, especially since there is only 1 bot. \nthis app, powered by eleven labs allows realtime dialogue with different people, different scenarios, that helps you practice in a more realistic multi-person scenario. \n\nFirst time using eleven labs, and I ran out of credits, most likely poor prompting.",
    "toolsUsed": "ElevenLabs Agents",
    "submissionType": "Individual",
    "videoUrl": "https://drive.google.com/file/d/1798kmNpM9OOEoUSLqm8UNrJKdHfGVIpl/view?usp=sharing",
    "additionalLinks": [],
    "sourceRows": [
      3
    ]
  },
  {
    "id": "elevenlabs-tokyo-4",
    "title": "Nobu Job Hunts in Summer 2027",
    "participantName": "Jake Laddis + Yuki Takashima",
    "additionalTeamMembers": [],
    "description": "Nobu Job Hunts in Summer 2027 with the help of his personal agent and an agent from Cognisor AI.",
    "toolsUsed": "Other",
    "submissionType": "Team",
    "videoUrl": "https://youtu.be/nwfxpxLwzn4",
    "additionalLinks": [],
    "sourceRows": [
      4
    ]
  },
  {
    "id": "elevenlabs-tokyo-5",
    "title": "Keigo sitcom",
    "participantName": "Mohana Das",
    "additionalTeamMembers": [
      "Bryony Edgell",
      "Keito Ochi"
    ],
    "description": "Using Keigo in a Japanese office can feel impossible, especially for foreign workers! Our video demonstrates a comedic situation where a foreign worker tries to use Keigo and ends up in a funny situation (2 of us are first time users of ElevenLabs, so we couldn't make a 40 second video but we tried out best)",
    "toolsUsed": "Other",
    "submissionType": "Team",
    "videoUrl": "https://drive.google.com/file/d/1PDyP6Rmb8GovbzjUHvVeCzwNwQcm5rJk/view?usp=sharing",
    "additionalLinks": [],
    "sourceRows": [
      5
    ]
  },
  {
    "id": "elevenlabs-tokyo-6",
    "title": "elevenlabs creative example",
    "participantName": "Keiichi Ogawa",
    "additionalTeamMembers": [],
    "description": "Actually this is the first time to handle eleven creative.",
    "toolsUsed": "Text to Speech",
    "submissionType": "Individual",
    "videoUrl": "https://youtu.be/kjaNAsoMgiI",
    "additionalLinks": [],
    "sourceRows": [
      6
    ]
  },
  {
    "id": "elevenlabs-tokyo-7",
    "title": "Dijital Twin",
    "participantName": "Kento Ishizeki",
    "additionalTeamMembers": [],
    "description": "Problem: Mid-career hiring in Japan is full of mismatches. Interviews only happen late on weeknights or on weekends. Candidates prepare while working full-time, and recruiters lose time they need for real work. Both sides try to look their best, so neither knows if it’s a true fit until after joining. That leads to early resignations.\n\nSolution — “Twin Trial”: Companies build an AI clone of their workplace. Candidates create a digital twin through an AI interview designed to reveal who they really are. The twin “works” at the virtual company for a few days. Then both sides get a match score, and only matched pairs go on to a real interview, using the twin’s performance as the starting point for the conversation.\n\nElevenCreative: We used Text to Speech for the narration and characters, Voice Design to give the twin its own slightly digital voice, Sound Effects and Music to contrast the stressful “before” with the hopeful “after,” and ElevenCreative to put it all together into one video.\n\nKey message: “Work together before you interview.”",
    "toolsUsed": "ElevenLabs Agents",
    "submissionType": "Individual",
    "videoUrl": "https://youtu.be/xDaCJC97xEM",
    "additionalLinks": [
      {
        "label": "Earlier ElevenLabs submission",
        "url": "https://elevenlabs.io/app/image-video?generationId=yCEMQrj9jjSMXk7Wd4fw",
        "note": "The participant supplied the YouTube video above as the corrected link. This earlier link may require ElevenLabs access."
      }
    ],
    "sourceRows": [
      7,
      14
    ]
  },
  {
    "id": "elevenlabs-tokyo-8",
    "title": "Intelligent team role matching for collaboration",
    "participantName": "Kunal Rajpurohit",
    "additionalTeamMembers": [
      "OpenAI",
      "claude"
    ],
    "description": "AI enabled matching",
    "toolsUsed": "Voice Cloning / Voice Design",
    "submissionType": "Team",
    "videoUrl": "https://drive.google.com/file/d/1Df0FvEd5O1Rk73WVN_qrQW-dGPKxzltL/view?usp=drivesdk",
    "additionalLinks": [],
    "sourceRows": [
      8
    ]
  },
  {
    "id": "elevenlabs-tokyo-9",
    "title": "That is just how work is",
    "participantName": "Tsubasa Oyama",
    "additionalTeamMembers": [],
    "description": "That is the nature.",
    "toolsUsed": "Other",
    "submissionType": "Individual",
    "videoUrl": "https://youtu.be/QJ6wkxN5LIQ",
    "additionalLinks": [],
    "sourceRows": [
      9
    ]
  },
  {
    "id": "elevenlabs-tokyo-10",
    "title": "KAI elder care robot of the future",
    "participantName": "Wesley Kao",
    "additionalTeamMembers": [],
    "description": "A robot agent that solves Japan's elder care worker shortage issue",
    "toolsUsed": "Voice Cloning / Voice Design",
    "submissionType": "Individual",
    "videoUrl": "https://drive.google.com/file/d/1fZBeddpnRKH0HJV_dgE8nMjxopGAsfRe/view?usp=sharing",
    "additionalLinks": [],
    "sourceRows": [
      10
    ]
  },
  {
    "id": "elevenlabs-tokyo-11",
    "title": "Action Changes the Future",
    "participantName": "Toru Ito",
    "additionalTeamMembers": [],
    "description": "A true story from our guesthouse in Asakusa. Three years ago, Max from Uruguay left Japan promising to return — and he did, on a working holiday. In Japan, no address means no bank account, no phone, and no job. Our guesthouse gave him an address. He opened a bank account, got a phone, and landed two jobs on his own, speaking gentle Japanese he learned from anime. Action changes the future.\n\nElevenLabs: Text to Speech (narration), Music (background score), Speech to Text (footage review). Real footage of Max is used with his permission.",
    "toolsUsed": "Text to Speech",
    "submissionType": "Individual",
    "videoUrl": "https://action-changes-the-future.vercel.app/",
    "additionalLinks": [],
    "sourceRows": [
      11
    ],
    "previewStatus": "unavailable",
    "previewNote": "This submitted project website is currently unavailable. You can still open the original link below."
  },
  {
    "id": "elevenlabs-tokyo-12",
    "title": "larptest",
    "participantName": "Azat Samatuly",
    "additionalTeamMembers": [],
    "description": "larptest",
    "toolsUsed": "Voice Cloning / Voice Design",
    "submissionType": "Individual",
    "videoUrl": "https://youtu.be/mrnNSyPWiho",
    "additionalLinks": [],
    "sourceRows": [
      12
    ]
  },
  {
    "id": "elevenlabs-tokyo-15",
    "title": "Career Bridge JP - Multilingual Interview Experience",
    "participantName": "Taira Sakakibara & Emiko Sato",
    "additionalTeamMembers": [],
    "description": "Despite the limited time in the hackathon, through trial and error, we managed to cross the finish line and bring this project to life. Utilizing ElevenLabs' features and agents, we created an expressive, interactive experience. It was a wonderful collaborative challenge for our team (Taira Sakakibara & Emiko Sato).",
    "toolsUsed": "Text to Speech",
    "submissionType": "Team",
    "videoUrl": "https://drive.google.com/file/d/1ql9qqXbAehom5XTbXiZY9XdHKkvd5QOh/view?usp=sharing",
    "additionalLinks": [],
    "sourceRows": [
      15,
      16
    ]
  },
  {
    "id": "elevenlabs-tokyo-17",
    "title": "BTR",
    "participantName": "Peter Huang",
    "additionalTeamMembers": [
      "Claire Lin",
      "Bryon Gibbens"
    ],
    "description": "Beyond the Resume is an AI-run boutique agency that helps Japan’s global talent get read for what they have actually done.",
    "toolsUsed": "ElevenLabs Agents",
    "submissionType": "Team",
    "videoUrl": "https://youtu.be/9alcVTenjfM",
    "additionalLinks": [],
    "sourceRows": [
      17
    ]
  },
  {
    "id": "elevenlabs-tokyo-18",
    "title": "Profile Check",
    "participantName": "Jyan Zarate",
    "additionalTeamMembers": [],
    "description": "At first I thought about a b2b tool for HR departments to screen candidate's internet presence but it seemed a bit dystopian, so I flipped it into helping candidates find troublesome posts.",
    "toolsUsed": "Text to Speech",
    "submissionType": "Individual",
    "videoUrl": "https://youtu.be/JEP3DVNbI9s",
    "additionalLinks": [],
    "sourceRows": [
      18
    ]
  }
];

/** Top five from the workbook's Rank column: H10, H7, H6, H18 and H5.
 * Kento's original ranked row links to his consolidated, corrected submission.
 */
export const ELEVENLABS_WINNERS: readonly {
  rank: 1 | 2 | 3 | 4 | 5;
  submissionId: string;
}[] = [
  { rank: 1, submissionId: "elevenlabs-tokyo-10" },
  { rank: 2, submissionId: "elevenlabs-tokyo-7" },
  { rank: 3, submissionId: "elevenlabs-tokyo-6" },
  { rank: 4, submissionId: "elevenlabs-tokyo-18" },
  { rank: 5, submissionId: "elevenlabs-tokyo-5" },
];
