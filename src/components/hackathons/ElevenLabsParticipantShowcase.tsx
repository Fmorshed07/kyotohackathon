import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ExternalLink, Play, Trophy, Users, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ELEVENLABS_SUBMISSIONS, ELEVENLABS_WINNERS, type ElevenLabsSubmission } from "@/data/elevenLabsSubmissions";
import { ELEVENLABS_MEETUP_ID } from "@/lib/elevenLabsMeetup";
import { getProjectFeedVideo, projectFeedEmbedUrl, projectFeedHttpUrl } from "@/lib/projectFeedMedia";
import "./elevenLabsParticipantShowcase.css";

const WEBSITE_PREVIEW_URL = "https://action-changes-the-future.vercel.app/";
const WINNER_PLACES = ["1st", "2nd", "3rd", "4th", "5th"];

function SubmissionPreview({ submission, index, active, onToggle, mode = "gallery" }: {
  submission: ElevenLabsSubmission;
  index: number;
  active: boolean;
  onToggle?: () => void;
  mode?: "gallery" | "winner";
}) {
  const [failed, setFailed] = useState(false);
  const sourceUrl = projectFeedHttpUrl(submission.videoUrl);
  const video = getProjectFeedVideo(sourceUrl);
  const canPreview = Boolean(video || sourceUrl === WEBSITE_PREVIEW_URL) && submission.previewStatus !== "unavailable";
  const previewLabel = video ? "video" : "website";
  const previewTitle = `${submission.title} ${mode === "winner" ? "winner " : ""}${previewLabel} preview`;
  const embedUrl = video
    ? projectFeedEmbedUrl(video, { autoplay: false, muted: false })
    : sourceUrl;

  return (
    <div className="elevenlabs-submission-preview">
      {active && canPreview && !failed ? (
        video?.kind === "native" ? (
          <video controls playsInline preload="metadata" src={video.url}
            aria-label={previewTitle} onError={() => setFailed(true)} />
        ) : (
          <iframe
            title={previewTitle}
            src={embedUrl}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox={video ? "allow-scripts allow-same-origin allow-presentation allow-popups" : "allow-scripts allow-forms allow-popups"}
            onErrorCapture={() => setFailed(true)}
          />
        )
      ) : (
        <div className="elevenlabs-preview-cover">
          <span className="elevenlabs-preview-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div className="elevenlabs-preview-wave" aria-hidden="true">
            {[24, 40, 64, 35, 80, 54, 96, 62, 38, 72, 48, 28].map((height, bar) => (
              <span key={bar} style={{ height: `${height}%` }} />
            ))}
          </div>
          {failed && active ? (
            <p role="status">This preview couldn’t load. Use the original link below.</p>
          ) : canPreview && mode === "gallery" ? (
            <button type="button" className="elevenlabs-preview-play"
              aria-label={`Preview ${submission.title} ${previewLabel}`}
              onClick={() => { setFailed(false); onToggle?.(); }}>
              <Play aria-hidden="true" /><span>Preview {previewLabel}</span>
            </button>
          ) : (
            <p className="elevenlabs-video-pending">{submission.previewStatus === "unavailable" ? "Preview unavailable" : sourceUrl ? "Open the original link below" : "Video link pending"}</p>
          )}
        </div>
      )}
      {active && mode === "gallery" ? (
        <button type="button" className="elevenlabs-preview-close" onClick={onToggle}
          aria-label={`Close ${submission.title} preview`}><X aria-hidden="true" /></button>
      ) : null}
    </div>
  );
}

export default function ElevenLabsParticipantShowcase({ variant = "home", submissions = ELEVENLABS_SUBMISSIONS }: {
  variant?: "home" | "event";
  submissions?: readonly ElevenLabsSubmission[];
}) {
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const { hash } = useLocation();
  const sectionId = variant === "home" ? "elevenlabs-participants" : "participants";
  const cardId = (submissionId: string) => `${sectionId}-${submissionId}`;
  const winners = ELEVENLABS_WINNERS.flatMap(winner => {
    const submission = submissions.find(project => project.id === winner.submissionId);
    return submission ? [{ ...winner, submission }] : [];
  });

  return (
    <section id={sectionId} className={`elevenlabs-showcase elevenlabs-showcase--${variant}`}
      aria-labelledby={`${sectionId}-title`}>
      <div className="elevenlabs-showcase-inner">
        <header className="elevenlabs-showcase-heading">
          <div>
            <p className="elevenlabs-showcase-eyebrow"><span aria-hidden="true">Ⅱ</span> ElevenLabs · Tokyo · 9 October 2026</p>
            <h2 id={`${sectionId}-title`}>One evening.<br /><span>A room full of ideas.</span></h2>
            <p>Meet the builders and explore what they made with ElevenLabs. Watch their demos, read their stories, and open the projects.</p>
          </div>
          <div className="elevenlabs-showcase-meta">
            <span><strong>{submissions.length}</strong> participant projects</span>
            {variant === "home" ? <Link to={`/events/${ELEVENLABS_MEETUP_ID}`}>Explore the meetup <ArrowUpRight aria-hidden="true" /></Link> : null}
          </div>
        </header>

        {winners.length > 0 ? (
          <section id={`${sectionId}-winners`} className="elevenlabs-winners" aria-labelledby={`${sectionId}-winners-title`}>
            <header className="elevenlabs-winners-heading">
              <div><p><Trophy aria-hidden="true" /> The winning ideas</p><h3 id={`${sectionId}-winners-title`}>Top 5 winners</h3></div>
              <p>Celebrating the builders who stood out in Tokyo.</p>
            </header>
            <ol className="elevenlabs-winners-list" aria-label="Top 5 winning projects">
              {winners.map(({ rank, submission }) => {
                const target = `#${cardId(submission.id)}`;
                const originalUrl = projectFeedHttpUrl(submission.videoUrl);
                return (
                  <li key={submission.id} value={rank} className={rank === 1 ? "elevenlabs-winner elevenlabs-winner--first" : "elevenlabs-winner"}>
                    <SubmissionPreview submission={submission} index={rank - 1} active mode="winner" />
                    <div className="elevenlabs-winner-content">
                      <div className="elevenlabs-winner-placement"><span className="elevenlabs-winner-rank">{WINNER_PLACES[rank - 1]}<span> place</span></span>{rank === 1 ? <Trophy aria-hidden="true" /> : null}</div>
                      <p className="elevenlabs-winner-title">{submission.title}</p>
                      <p className="elevenlabs-winner-people">{[submission.participantName, ...submission.additionalTeamMembers].join(", ")}</p>
                      {submission.previewNote ? <p className="elevenlabs-link-note">{submission.previewNote}</p> : null}
                      <div className="elevenlabs-winner-links">
                        {originalUrl ? <a href={originalUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${submission.title} original winner video`}>Original video<ExternalLink aria-hidden="true" /></a> : null}
                        <Link to={target} aria-label={`Explore ${WINNER_PLACES[rank - 1]} place project: ${submission.title}`}
                          onClick={() => {
                            // The page hash effects handle navigation; a repeated fragment needs an explicit scroll.
                            if (hash === target) document.getElementById(cardId(submission.id))?.scrollIntoView({ block: "start", behavior: "instant" });
                          }}>
                          Project details<ArrowDownRight aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {winners.length > 0 ? <p className="elevenlabs-all-projects-label">All {submissions.length} participant projects</p> : null}
        <div className="elevenlabs-submission-grid">
          {submissions.map((submission, index) => {
            const videoUrl = projectFeedHttpUrl(submission.videoUrl);
            const links = [
              ...(videoUrl ? [{ label: getProjectFeedVideo(videoUrl) ? "Original video" : videoUrl === WEBSITE_PREVIEW_URL ? "Project website" : "Original submission", url: videoUrl, note: undefined as string | undefined }] : []),
              ...submission.additionalLinks.map(link => ({ ...link, url: projectFeedHttpUrl(link.url) })).filter(link => link.url),
            ];
            return (
              <article key={submission.id} id={cardId(submission.id)} className="elevenlabs-submission-card" aria-labelledby={`${cardId(submission.id)}-title`}>
                <SubmissionPreview submission={submission} index={index} active={activePreview === submission.id}
                  onToggle={() => setActivePreview(current => current === submission.id ? null : submission.id)} />
                <div className="elevenlabs-submission-content">
                  <div className="elevenlabs-submission-byline"><Users aria-hidden="true" /><span>{submission.participantName}</span><span className="elevenlabs-submission-type">{submission.submissionType}</span></div>
                  <h3 id={`${cardId(submission.id)}-title`}>{submission.title}</h3>
                  <p className="elevenlabs-submission-summary">{submission.description}</p>
                  <details className="elevenlabs-submission-details">
                    <summary>Project details <ChevronDown aria-hidden="true" /></summary>
                    <dl>
                      <dt>About the project</dt><dd>{submission.description}</dd>
                      <dt>{submission.submissionType === "Team" ? "Team" : "Participant"}</dt>
                      <dd>{[submission.participantName, ...submission.additionalTeamMembers].join(", ")}</dd>
                      {submission.toolsUsed ? <><dt>Tools used</dt><dd>{submission.toolsUsed}</dd></> : null}
                    </dl>
                  </details>
                  <div className="elevenlabs-submission-links" aria-label={`${submission.title} original links`}>
                    {submission.previewNote ? <p className="elevenlabs-link-note">{submission.previewNote}</p> : null}
                    {links.map((link, linkIndex) => (
                      <div key={`${link.url}-${linkIndex}`}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <span className="elevenlabs-link-label">{link.label}<ExternalLink aria-hidden="true" /></span>
                          <span className="elevenlabs-link-url">{link.url}</span>
                        </a>
                        {link.note ? <p className="elevenlabs-link-note">{link.note}</p> : null}
                      </div>
                    ))}
                    {submission.missingVideoFilename ? <p className="elevenlabs-link-note">Video link pending: <span>{submission.missingVideoFilename}</span></p> : null}
                  </div>
                  {activePreview === submission.id ? <p className="elevenlabs-preview-help">If the preview is blocked or asks you to sign in, open the original link above.</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
