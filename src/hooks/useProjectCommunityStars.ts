import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { isValidSubscribeEmail, subscribeToHackathons } from "@/lib/hackathonSubscribe";
import {
  communityStarFill,
  EMPTY_STAR_STATS,
  fetchProjectStarStats,
  readLocalStarRatings,
  readSavedStarEmail,
  saveProjectStarRating,
  starRatingDelta,
  voterIdFromEmail,
  writeLocalStarRating,
  writeSavedStarEmail,
  type StarStats,
} from "@/lib/projectStars";

type StarEmailPrompt = { projectId: string; stars: number };

export function useProjectCommunityStars() {
  const [statsById, setStatsById] = useState<Record<string, StarStats>>({});
  const [myRatingById, setMyRatingById] = useState<Record<string, number>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [emailPrompt, setEmailPrompt] = useState<StarEmailPrompt | null>(null);

  useEffect(() => {
    setMyRatingById(readSavedStarEmail() ? readLocalStarRatings() : {});
    let isCurrent = true;
    const db = getFirestoreDb();
    void fetchProjectStarStats(db)
      .then((stats) => {
        if (isCurrent) setStatsById(stats);
      })
      .catch(() => {
        if (isCurrent) setStatsById({});
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const commitStar = async (projectId: string, stars: number, email: string) => {
    if ((myRatingById[projectId] ?? 0) > 0) {
      toast("You already starred this project");
      return;
    }

    const voter = await voterIdFromEmail(email);
    const previous = 0;
    const next = stars;
    const delta = starRatingDelta(previous, next);
    const currentStats = statsById[projectId] ?? EMPTY_STAR_STATS;
    const db = getFirestoreDb();

    setPendingId(projectId);
    setMyRatingById((current) => ({ ...current, [projectId]: next }));
    writeLocalStarRating(projectId, next);
    writeSavedStarEmail(email);
    setStatsById((current) => ({
      ...current,
      [projectId]: {
        sum: Math.max(0, (current[projectId]?.sum ?? 0) + delta.sum),
        count: Math.max(0, (current[projectId]?.count ?? 0) + delta.count),
      },
    }));

    try {
      await subscribeToHackathons(db, email, "project-star");
      await saveProjectStarRating(db, {
        projectId,
        userId: voter,
        stars: next,
        email,
      });
    } catch (error) {
      setMyRatingById((current) => {
        const nextRatings = { ...current };
        delete nextRatings[projectId];
        return nextRatings;
      });
      setStatsById((current) => ({ ...current, [projectId]: currentStats }));
      toast.error(error instanceof Error ? error.message : "Could not save your star rating.");
    } finally {
      setPendingId(null);
    }
  };

  const rate = async (projectId: string, stars: number) => {
    if ((myRatingById[projectId] ?? 0) > 0) {
      toast("You already starred this project");
      return;
    }
    const savedEmail = readSavedStarEmail();
    if (savedEmail) {
      await commitStar(projectId, stars, savedEmail);
      return;
    }
    setEmailPrompt({ projectId, stars });
  };

  const submitStarEmail = async (email: string) => {
    if (!emailPrompt) return;
    if (!isValidSubscribeEmail(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    const pending = emailPrompt;
    setEmailPrompt(null);
    await commitStar(pending.projectId, pending.stars, email);
  };

  return {
    statsById,
    myRatingById,
    pendingId,
    emailPrompt,
    canRate: true,
    communityFill: (projectId: string) => communityStarFill(statsById[projectId] ?? EMPTY_STAR_STATS),
    rate,
    submitStarEmail,
    cancelStarEmail: () => setEmailPrompt(null),
  };
}
