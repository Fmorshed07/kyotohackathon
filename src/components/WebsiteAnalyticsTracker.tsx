import { useEffect } from "react";
import { logEvent } from "firebase/analytics";
import { useLocation } from "react-router-dom";
import { getFirebaseAnalytics, getFirestoreDb } from "@/lib/firebaseClient";
import {
  getAnalyticsPageGroup,
  isPublicAnalyticsPath,
  recordSitePageView,
} from "@/lib/siteAnalytics";

let lastTrackedPath = "";
let lastTrackedAt = 0;

export function WebsiteAnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    if (!isPublicAnalyticsPath(pathname)) return;
    const now = Date.now();
    if (lastTrackedPath === pathname && now - lastTrackedAt < 2_000) return;
    lastTrackedPath = pathname;
    lastTrackedAt = now;

    try {
      void recordSitePageView(getFirestoreDb(), pathname).catch(() => {
        // Analytics must never interrupt the visitor experience.
      });
      void getFirebaseAnalytics()
        .then((analytics) => {
          if (!analytics) return;
          logEvent(analytics, "page_view", {
            page_location: `${window.location.origin}${pathname}`,
            page_path: pathname,
            page_title: document.title,
            page_group: getAnalyticsPageGroup(pathname),
          });
        })
        .catch(() => {
          // Some browsers block analytics; first-party Firestore metrics remain best-effort.
        });
    } catch {
      // Missing Firebase configuration in local previews should not crash a route.
    }
  }, [location.pathname]);

  return null;
}
