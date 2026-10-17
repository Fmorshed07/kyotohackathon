import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getFirestoreDb } from "@/lib/firebaseClient";
import {
  clearPendingInvite,
  getEventBoardPathAfterTeamInvite,
  stashPendingInvite,
} from "@/lib/inviteTokens";
import {
  acceptTeamInvite,
  getTeamInvite,
} from "@/lib/portalInvites";
import type { TeamInvite } from "@/types/portal";
import JudgeInvitePage from "@/pages/JudgeInvitePage";

export default function InviteAcceptPage() {
  const { kind, token } = useParams<{ kind: string; token: string }>();
  return kind === "judge" && token
    ? <JudgeInvitePage key={token} token={token} />
    : <TeamInviteAcceptPage key={`${kind}:${token}`} />;
}

function TeamInviteAcceptPage() {
  const { kind, token } = useParams<{ kind: string; token: string }>();
  const inviteKind = kind === "team" ? "team" : null;
  const navigate = useNavigate();
  const db = getFirestoreDb();
  const { sessionUser, loading: authLoading } = usePortalAuth();

  const [teamInvite, setTeamInvite] = useState<TeamInvite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const autoJoinAttempted = useRef(false);

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
        const invite = await getTeamInvite(db, token);
        if (cancelled) return;
        if (!invite || invite.status !== "open") {
          setLoadError("This team invite is invalid or has been revoked.");
          setTeamInvite(null);
        } else {
          setTeamInvite(invite);
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
      navigate(
        getEventBoardPathAfterTeamInvite({
          hackathonId: result.hackathonId,
          teamName: result.teamName,
          submissionId: result.submissionId,
        }),
        { replace: true }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to join this team.";
      setActionError(
        /insufficient permissions|permission-denied/i.test(message)
          ? "Could not join this team. Sign in with a participant account and try the invite link again."
          : message
      );
    } finally {
      setIsActing(false);
    }
  };

  // Signed-in participants join as soon as the invite is valid — no extra click required.
  useEffect(() => {
    if (authLoading || isLoadingInvite || inviteKind !== "team" || !token || !teamInvite) return;
    if (!sessionUser || sessionUser.role !== "participant") return;
    if (autoJoinAttempted.current || isActing) return;
    autoJoinAttempted.current = true;
    void handleAcceptTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto join for invite deep links
  }, [
    authLoading,
    isLoadingInvite,
    inviteKind,
    token,
    teamInvite,
    sessionUser,
    isActing,
  ]);

  const goSignUp = () => {
    if (!inviteKind || !token) return;
    stashPendingInvite(inviteKind, token);
    navigate(`/signup?role=participant&invite=${encodeURIComponent(token)}`);
  };

  const goSignIn = () => {
    if (!inviteKind || !token) return;
    stashPendingInvite(inviteKind, token);
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
              <Users className="h-5 w-5 text-primary" />
              Team invite
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
                    {isActing ? "Joining team…" : "Join this team"}
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
