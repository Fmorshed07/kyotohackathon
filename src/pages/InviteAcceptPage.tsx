import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Scale, Users } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { getHackathonById, getJudgeEventWorkspacePath, isHackathonId } from "@/lib/hackathons";
import {
  clearPendingInvite,
  getJudgeDashboardPathAfterInvite,
  stashPendingInvite,
} from "@/lib/inviteTokens";
import {
  acceptTeamInvite,
  getJudgeInvite,
  getTeamInvite,
  redeemJudgeInvite,
} from "@/lib/portalInvites";
import type { PortalJudgeInvite, TeamInvite } from "@/types/portal";

type InviteKind = "team" | "judge";

export default function InviteAcceptPage() {
  const { kind, token } = useParams<{ kind: string; token: string }>();
  const inviteKind: InviteKind | null =
    kind === "team" || kind === "judge" ? kind : null;
  const navigate = useNavigate();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();

  const [teamInvite, setTeamInvite] = useState<TeamInvite | null>(null);
  const [judgeInvite, setJudgeInvite] = useState<PortalJudgeInvite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const autoRedeemAttempted = useRef(false);

  const judgePrimaryHackathonId = judgeInvite?.hackathon_ids.find(isHackathonId) ?? null;
  const judgeDashboardPath = judgePrimaryHackathonId
    ? getJudgeEventWorkspacePath(judgePrimaryHackathonId)
    : "/dashboard/judge";

  useEffect(() => {
    if (!inviteKind || !token) {
      setLoadError("This invite link is incomplete.");
      setIsLoadingInvite(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoadingInvite(true);
      setLoadError(null);
      try {
        if (inviteKind === "team") {
          const invite = await getTeamInvite(db, token);
          if (cancelled) return;
          if (!invite || invite.status !== "open") {
            setLoadError("This team invite is invalid or has been revoked.");
            setTeamInvite(null);
          } else {
            setTeamInvite(invite);
          }
        } else {
          const invite = await getJudgeInvite(db, token);
          if (cancelled) return;
          if (!invite || invite.status !== "open") {
            setLoadError("This judge invite is invalid or has been revoked.");
            setJudgeInvite(null);
          } else {
            setJudgeInvite(invite);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load this invite."
          );
        }
      } finally {
        if (!cancelled) setIsLoadingInvite(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [db, inviteKind, token]);

  const judgeHackathonLabels = useMemo(() => {
    if (!judgeInvite) return [];
    return judgeInvite.hackathon_ids.map((id) => getHackathonById(id).name);
  }, [judgeInvite]);

  const handleAcceptTeam = async () => {
    if (!token || !sessionUser || sessionUser.role !== "participant") return;
    setIsActing(true);
    setActionError(null);
    try {
      const result = await acceptTeamInvite(db, token, {
        userId: sessionUser.id,
        name: sessionUser.profile?.fullName?.trim() || sessionUser.email.split("@")[0] || "Teammate",
        email: sessionUser.email,
        enrolledHackathonIds: sessionUser.hackathonIds,
      });
      clearPendingInvite("team");
      navigate(`/dashboard/participant?joinedTeam=${encodeURIComponent(result.teamName)}`, {
        replace: true,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to join this team.");
    } finally {
      setIsActing(false);
    }
  };

  const handleRedeemJudge = async () => {
    if (!token || !sessionUser) return;
    setIsActing(true);
    setActionError(null);
    try {
      const result = await redeemJudgeInvite(db, token, {
        userId: sessionUser.id,
        email: sessionUser.email,
        existingHackathonIds: sessionUser.hackathonIds,
      });
      clearPendingInvite("judge");
      navigate(getJudgeDashboardPathAfterInvite(result.primaryHackathonId), { replace: true });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to activate judge access."
      );
    } finally {
      setIsActing(false);
    }
  };

  // Signed-in judges/mentors (or accounts without a role yet) redeem and open the event workspace.
  useEffect(() => {
    if (authLoading || isLoadingInvite || inviteKind !== "judge" || !token || !judgeInvite) return;
    if (!sessionUser) return;
    const eligible =
      sessionUser.role === "judge" ||
      sessionUser.role === "mentor" ||
      !sessionUser.role;
    if (!eligible || sessionUser.role === "admin") return;
    if (autoRedeemAttempted.current || isActing) return;
    autoRedeemAttempted.current = true;
    void handleRedeemJudge();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto redeem for invite deep links
  }, [
    authLoading,
    isLoadingInvite,
    inviteKind,
    token,
    judgeInvite,
    sessionUser,
    isActing,
  ]);

  const goSignUp = () => {
    if (!inviteKind || !token) return;
    stashPendingInvite(inviteKind, token);
    if (inviteKind === "judge") {
      navigate(`/signup?role=judge&invite=${encodeURIComponent(token)}`);
      return;
    }
    navigate(`/signup?role=participant&invite=${encodeURIComponent(token)}`);
  };

  const goSignIn = () => {
    if (!inviteKind || !token) return;
    stashPendingInvite(inviteKind, token);
    if (inviteKind === "judge") {
      navigate(`/signin?role=judge&invite=${encodeURIComponent(token)}`);
      return;
    }
    navigate(`/signin?role=participant&invite=${encodeURIComponent(token)}`);
  };

  const showLoading = authLoading || isLoadingInvite;

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <AnimatedBackground />
      <div className="relative z-10 mx-auto flex min-h-svh max-w-lg flex-col justify-center px-4 py-10">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="md" showWordmark wordmark="COGNISOR" href="/" />
        </div>
        <Card className="border-white/10 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              {inviteKind === "judge" ? (
                <Scale className="h-5 w-5 text-primary" />
              ) : (
                <Users className="h-5 w-5 text-primary" />
              )}
              {inviteKind === "judge" ? "Judge portal invite" : "Team invite"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showLoading ? (
              <p className="text-sm text-muted-foreground">Loading invite…</p>
            ) : loadError ? (
              <>
                <p className="text-sm text-destructive">{loadError}</p>
                <Button asChild variant="outline">
                  <Link to="/">Back home</Link>
                </Button>
              </>
            ) : inviteKind === "team" && teamInvite ? (
              <>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve been invited to join{" "}
                  <span className="font-medium text-foreground">{teamInvite.team_name}</span>
                  {teamInvite.owner_name ? ` by ${teamInvite.owner_name}` : ""}.
                </p>
                {teamInvite.owner_email ? (
                  <p className="text-sm">
                    Contact:{" "}
                    <a
                      className="text-primary hover:underline"
                      href={`mailto:${teamInvite.owner_email}`}
                    >
                      {teamInvite.owner_email}
                    </a>
                  </p>
                ) : null}
                {sessionUser?.role === "participant" ? (
                  <Button type="button" disabled={isActing} onClick={() => void handleAcceptTeam()}>
                    {isActing ? "Joining…" : "Join team"}
                  </Button>
                ) : sessionUser ? (
                  <p className="text-sm text-muted-foreground">
                    Sign in with a participant account to join this team. Your current role is{" "}
                    {sessionUser.role}.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={goSignUp}>
                      Sign up to join
                    </Button>
                    <Button type="button" variant="outline" onClick={goSignIn}>
                      Log in
                    </Button>
                  </div>
                )}
              </>
            ) : inviteKind === "judge" && judgeInvite ? (
              <>
                <p className="text-sm text-muted-foreground">
                  This link grants direct access to the judging portal for the assigned event
                  {judgeInvite.label ? ` (${judgeInvite.label})` : ""}.
                </p>
                {judgeHackathonLabels.length > 0 ? (
                  <p className="text-sm text-foreground">
                    Event{judgeHackathonLabels.length > 1 ? "s" : ""}:{" "}
                    {judgeHackathonLabels.join(", ")}
                  </p>
                ) : null}
                {sessionUser &&
                (sessionUser.role === "judge" ||
                  sessionUser.role === "mentor" ||
                  !sessionUser.role) ? (
                  <Button type="button" disabled={isActing} onClick={() => void handleRedeemJudge()}>
                    {isActing ? "Opening event workspace…" : "Open event judge dashboard"}
                  </Button>
                ) : sessionUser?.role === "admin" ? (
                  <Button asChild>
                    <Link to="/dashboard/admin">You already have admin access</Link>
                  </Button>
                ) : sessionUser ? (
                  <p className="text-sm text-muted-foreground">
                    This invite is for judges. Your account is registered as {sessionUser.role}.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={goSignUp}>
                      Sign up as judge
                    </Button>
                    <Button type="button" variant="outline" onClick={goSignIn}>
                      Log in
                    </Button>
                  </div>
                )}
                {sessionUser &&
                sessionUser.role === "judge" &&
                sessionUser.judgeApprovalStatus === "approved" ? (
                  <Button asChild variant="ghost">
                    <Link to={judgeDashboardPath}>Go to event dashboard</Link>
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Invite not found.</p>
            )}
            {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
