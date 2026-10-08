import { ArrowDown, Briefcase, FileSearch, MessageSquare, Sparkles, Target, Upload } from "lucide-react";
import PeerPortalCampaign from "@/components/PeerPortalCampaign";
import "./peer-careers.css";

const PROMO_CODE = "PEER@STT";
const guideSteps = [
  {
    icon: Upload,
    title: "Create your free Peer Portal account",
    description:
      "Open peerportal.app and start free. Cognisor builders use Peer Portal—the official get-hired partner of Cognisor AI—to turn hackathon momentum into real Japan offers.",
    tips: [
      "Start on Starter to build your profile, parse your CV, and discover Japan-fit roles.",
      `Upgrade to Student Pro for auto-apply and interview coaching—use promo code ${PROMO_CODE} for 2 free months.`,
    ],
  },
  {
    icon: MessageSquare,
    title: "Import your Cognisor builder story",
    description:
      "Upload your CV or chat with Peer. Add Cognisor Impact projects, demos, and GitHub links so AI matching sees shipping proof—not a generic resume.",
    tips: [
      "State your hire goal clearly: Tokyo, nationwide 求人, internship, or full-time.",
      "Complete the profile checklist until your strength monitor looks offer-ready.",
    ],
  },
  {
    icon: FileSearch,
    title: "Score your CV for Japan-fit hires",
    description:
      "Run CV Analysis before you apply. Peer Portal shows strengths, gaps, and which Tokyo or nationwide tracks fit Cognisor-trained builders.",
    tips: [
      "Fix gaps first—role targeting, language readiness, and project proof.",
      "Polish English CVs and Japan-ready 履歴書・職務経歴書 when recruiters expect both.",
    ],
  },
  {
    icon: Sparkles,
    title: "Ship resume + portfolio assets",
    description:
      "Use AI Resume Maker and Portfolio Maker to turn hackathon builds into ATS-friendly materials that help you get hired faster.",
    tips: [
      "Target one role family at a time (AI engineer, product, research intern).",
      "Feature Cognisor hackathon outcomes and live demos from the Cognisor ecosystem.",
    ],
  },
  {
    icon: Target,
    title: "Match roles that can hire you",
    description:
      "Let semantic matching rank Tokyo careers, internships, remote roles, and Japan-first openings by skills, language, and trajectory.",
    tips: [
      "Prioritize high-fit matches over spray-and-pray applications.",
      "Filter internship tracks if you are early-career or post-hackathon.",
    ],
  },
  {
    icon: Briefcase,
    title: "Apply, interview, and get hired",
    description:
      "Use the application command center to apply or auto-apply, track every reply, and practice with AI interview coaching—the last mile from Cognisor events to signed offers.",
    tips: [
      "Keep applications, interviews, and follow-ups in one inbox.",
      "Use personalised learning paths to close gaps while replies come in.",
    ],
  },
];

const LookingForJobsSection = () => (
  <section className="peer-careers" id="get-hired" aria-labelledby="get-hired-heading">
    <div className="peer-careers-inner">
      <div className="peer-careers-topline">
        <span><span className="peer-careers-dot" aria-hidden="true" />Your next chapter</span>
        <span>Cognisor <span aria-hidden="true">×</span> Peer Portal</span>
      </div>

      <PeerPortalCampaign />

      <details className="peer-careers-guide">
        <summary>
          <span>Your path from profile to opportunity</span>
          <span className="peer-careers-guide-cue">6 steps <ArrowDown aria-hidden="true" /></span>
        </summary>
        <ol>
          {guideSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <span className="peer-careers-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3><Icon aria-hidden="true" />{step.title}</h3>
                  <p>{step.description}</p>
                  <ul>{step.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
                </div>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  </section>
);

export default LookingForJobsSection;