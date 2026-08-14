import { useEffect, useMemo, useState } from "react";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { fetchPlatformOps, type PlatformOpsState } from "@/lib/platformOps";
import { evaluateProjectConcept } from "@/lib/projectScreening";
import type { PortalHackathon } from "@/lib/hackathons";
import {
  ProjectScreeningMarksSection,
  type ProjectScreeningMarkRow,
} from "@/components/dashboard/ProjectScreeningMarksSection";

export type ThemeMarksSubmission = {
  id: string;
  participantId?: string;
  user_id?: string;
  participantEmail?: string;
  owner_email?: string | null;
  owner_name?: string | null;
  teamName?: string | null;
  team_name?: string | null;
  title?: string | null;
  shortDescription?: string | null;
  short_description?: string | null;
  projectUrl?: string | null;
  project_url?: string | null;
  submissionPdfUrl?: string | null;
  submission_pdf_url?: string | null;
  demoVideoUrl?: string | null;
  demo_video_url?: string | null;
};

type ProjectThemeMarksPanelProps = {
  hackathon: PortalHackathon;
  submissions: ThemeMarksSubmission[];
  isLoading?: boolean;
};

export function ProjectThemeMarksPanel({
  hackathon,
  submissions,
  isLoading,
}: ProjectThemeMarksPanelProps) {
  const db = getFirestoreDb();
  const [ops, setOps] = useState<PlatformOpsState | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPlatformOps(db, hackathon.id)
      .then((state) => {
        if (!cancelled) setOps(state);
      })
      .catch(() => {
        if (!cancelled) setOps(null);
      });
    return () => {
      cancelled = true;
    };
  }, [db, hackathon.id]);

  const rows = useMemo<ProjectScreeningMarkRow[]>(() => {
    return submissions.map((submission) => {
      const title = submission.title?.trim() || "Untitled project";
      const concept =
        submission.shortDescription?.trim() || submission.short_description?.trim() || "";
      const evaluation = evaluateProjectConcept(
        {
          title,
          description: concept,
          projectUrl: submission.projectUrl ?? submission.project_url,
          submissionPdfUrl: submission.submissionPdfUrl ?? submission.submission_pdf_url,
          demoVideoUrl: submission.demoVideoUrl ?? submission.demo_video_url,
        },
        hackathon.theme,
      );
      const record = ops?.projectScreens?.[submission.id];
      return {
        id: submission.id,
        title,
        participantName:
          submission.owner_name?.trim() ||
          submission.participantEmail?.split("@")[0] ||
          submission.owner_email?.split("@")[0] ||
          "Builder",
        teamName: submission.teamName ?? submission.team_name ?? null,
        source: "submission" as const,
        status: record?.status ?? "pending",
        score: record?.score ?? evaluation.score,
        themeFit: evaluation.themeFit,
        conceptQuality: evaluation.conceptQuality,
      };
    });
  }, [hackathon.theme, ops?.projectScreens, submissions]);

  useEffect(() => {
    if (rows.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !rows.some((row) => row.id === activeId)) {
      setActiveId(rows[0].id);
    }
  }, [activeId, rows]);

  if (isLoading) {
    return (
      <section id="project-marks" className="scroll-mt-24 rounded-xl border border-white/[0.08] bg-card/70 px-4 py-6 sm:px-6">
        <p className="font-body text-sm text-muted-foreground">Loading theme marks…</p>
      </section>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div id="project-marks" className="scroll-mt-24">
      <ProjectScreeningMarksSection rows={rows} activeId={activeId} onSelect={setActiveId} />
    </div>
  );
}
