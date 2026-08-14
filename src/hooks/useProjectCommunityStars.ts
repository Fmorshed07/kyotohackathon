import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  communityStarFill,
  EMPTY_STAR_STATS,
  fetchMyProjectStarRatings,
  fetchProjectStarStats,
  saveProjectStarRating,
  starRatingDelta,
  type StarStats,
} from "@/lib/projectStars";

export function useProjectCommunityStars() {
  const navigate = useNavigate();
  const { sessionUser, loading: authLoading } = usePortalAuth();
  const [statsById, setStatsById] = useState<Record<string, StarStats>>({});
  const [myRatingById, setMyRatingById] = useState<Record<string, number>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    if (!sessionUser?.id) {
      setMyRatingById({});
      return;
    }
    let isCurrent = true;
    const db = getFirestoreDb();
    void fetchMyProjectStarRatings(db, sessionUser.id)
      .then((ratings) => {
        if (isCurrent) setMyRatingById(ratings);
      })
      .catch(() => {
        if (isCurrent) setMyRatingById({});
      });
    return () => {
      isCurrent = false;
    };
  }, [sessionUser?.id]);

  const rate = async (projectId: string, stars: number) => {
    if (authLoading) return;
    if (!sessionUser?.id) {
      toast("Sign in to star this project");
      navigate("/signin");
      return;
    }

    const previous = myRatingById[projectId] ?? 0;
    const next = previous === stars ? 0 : stars;
    const delta = starRatingDelta(previous, next);
    const currentStats = statsById[projectId] ?? EMPTY_STAR_STATS;

    setPendingId(projectId);
    setMyRatingById((current) => {
      const nextRatings = { ...current };
      if (next > 0) nextRatings[projectId] = next;
      else delete nextRatings[projectId];
      return nextRatings;
    });
    setStatsById((current) => ({
      ...current,
      [projectId]: {
        sum: Math.max(0, (current[projectId]?.sum ?? 0) + delta.sum),
        count: Math.max(0, (current[projectId]?.count ?? 0) + delta.count),
      },
    }));

    try {
      await saveProjectStarRating(getFirestoreDb(), {
        projectId,
        userId: sessionUser.id,
        stars: next > 0 ? next : null,
      });
    } catch (error) {
      setMyRatingById((current) => {
        const nextRatings = { ...current };
        if (previous > 0) nextRatings[projectId] = previous;
        else delete nextRatings[projectId];
        return nextRatings;
      });
      setStatsById((current) => ({ ...current, [projectId]: currentStats }));
      toast.error(error instanceof Error ? error.message : "Could not save your star rating.");
    } finally {
      setPendingId(null);
    }
  };

  return {
    statsById,
    myRatingById,
    pendingId,
    canRate: Boolean(sessionUser?.id),
    communityFill: (projectId: string) => communityStarFill(statsById[projectId] ?? EMPTY_STAR_STATS),
    rate,
  };
}
