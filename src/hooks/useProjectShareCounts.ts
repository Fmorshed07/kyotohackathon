import { useEffect, useState } from "react";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  EMPTY_SHARE_STATS,
  fetchProjectShareStats,
  readLocalProjectShares,
  saveProjectShare,
  writeLocalProjectShare,
  type ShareStats,
} from "@/lib/projectShares";

export function useProjectShareCounts() {
  const [statsById, setStatsById] = useState<Record<string, ShareStats>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void fetchProjectShareStats(getFirestoreDb())
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

  const recordShare = async (projectId: string) => {
    if (!projectId || pendingId === projectId || readLocalProjectShares()[projectId]) return;
    const current = statsById[projectId] ?? EMPTY_SHARE_STATS;
    setPendingId(projectId);
    try {
      const created = await saveProjectShare(getFirestoreDb(), projectId);
      writeLocalProjectShare(projectId);
      if (created) {
        setStatsById((stats) => ({
          ...stats,
          [projectId]: { count: (stats[projectId] ?? current).count + 1 },
        }));
      }
    } catch {
      // Sharing still succeeds even if analytics are temporarily unavailable.
    } finally {
      setPendingId(null);
    }
  };

  return {
    statsById,
    pendingId,
    shareCount: (projectId: string) => (statsById[projectId] ?? EMPTY_SHARE_STATS).count,
    recordShare,
  };
}
