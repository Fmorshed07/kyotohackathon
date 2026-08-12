import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { usePortalAuth } from "./hooks/usePortalAuth";
import {
  canAccessStaffDashboard,
  getDashboardPathForUser,
  participantNeedsOnboarding,
} from "./lib/portalRoutes";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import AdminSignIn from "./pages/AdminSignIn";
import HostSignIn from "./pages/HostSignIn";
import Dashboard from "./pages/Dashboard";
import ParticipantDashboardPage from "./pages/ParticipantDashboardPage";
import ParticipantProfilePage from "./pages/ParticipantProfilePage";
import ParticipantOnboardingPage from "./pages/ParticipantOnboardingPage";
import JudgeDashboardPage from "./pages/JudgeDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import HostDashboardPage from "./pages/HostDashboardPage";
import ScreeningAgentPage from "./pages/ScreeningAgentPage";
import PlatformOperationsPage from "./pages/PlatformOperationsPage";
import EventManagementPage from "./pages/EventManagementPage";
import HackathonsPage from "./pages/HackathonsPage";
import GeneratedHackathonPage from "./pages/GeneratedHackathonPage";
import HackathonBoardsPage from "./pages/HackathonBoardsPage";
import ProjectGalleryPage from "./pages/ProjectGalleryPage";
import ResourcesPage from "./pages/ResourcesPage";
import InviteAcceptPage from "./pages/InviteAcceptPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function FullScreenMessage({ message }: { message: string }) {
  return <div className="flex min-h-svh items-center justify-center bg-background"><p className="text-sm text-muted-foreground">{message}</p></div>;
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading) return <FullScreenMessage message="Loading..." />;
  // Keep auth-only users (signed into Google, no portal role yet) on signup/signin
  // so they can finish participant enrollment without admin help.
  if (!sessionUser?.role) return children;
  return (
    <Navigate
      to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus, {
        needsOnboarding: participantNeedsOnboarding(sessionUser),
      })}
      replace
    />
  );
}

function AdminSignInRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading) return <FullScreenMessage message="Loading..." />;
  if (sessionUser?.role === "admin") return <Navigate to="/dashboard/admin" replace />;
  return children;
}

function AdminProtectedRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading) return <FullScreenMessage message="Loading..." />;
  if (!sessionUser || sessionUser.role !== "admin") return <Navigate to="/admin" replace />;
  return children;
}

function HostProtectedRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading) return <FullScreenMessage message="Loading..." />;
  if (!sessionUser) return <Navigate to="/host/signin" replace />;
  // Admins can create/manage hosted events; hosts use their own workspace.
  if (sessionUser.role !== "host" && sessionUser.role !== "admin") {
    return <Navigate to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)} replace />;
  }
  return children;
}

function StaffProtectedRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading) return <FullScreenMessage message="Loading..." />;
  if (!sessionUser) return <Navigate to="/signin" replace />;
  if (!canAccessStaffDashboard(sessionUser.role, sessionUser.judgeApprovalStatus)) return <Navigate to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)} replace />;
  return children;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading) return <FullScreenMessage message="Loading..." />;
  if (!sessionUser) return <Navigate to="/signin" replace />;
  return children;
}

function ParticipantOnboardingRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading) return <FullScreenMessage message="Loading..." />;
  if (!sessionUser) return <Navigate to="/signup" replace />;
  if (sessionUser.role !== "participant") {
    return (
      <Navigate
        to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)}
        replace
      />
    );
  }
  return children;
}

function ParticipantProtectedRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();
  if (loading) return <FullScreenMessage message="Loading..." />;
  if (!sessionUser) return <Navigate to="/signin" replace />;
  if (sessionUser.role !== "participant") {
    return (
      <Navigate
        to={getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)}
        replace
      />
    );
  }
  if (participantNeedsOnboarding(sessionUser)) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/hackathons" element={<HackathonsPage />} />
          <Route path="/events/:hackathonId" element={<GeneratedHackathonPage />} />
          <Route path="/signin" element={<PublicOnlyRoute><SignIn /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignIn /></PublicOnlyRoute>} />
          <Route path="/onboarding" element={<ParticipantOnboardingRoute><ParticipantOnboardingPage /></ParticipantOnboardingRoute>} />
          <Route path="/admin" element={<AdminSignInRoute><AdminSignIn /></AdminSignInRoute>} />
          <Route path="/host/signin" element={<HostSignIn />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/participant" element={<ParticipantProtectedRoute><ParticipantDashboardPage /></ParticipantProtectedRoute>} />
          <Route path="/dashboard/participant/profile" element={<ParticipantProtectedRoute><ParticipantProfilePage /></ParticipantProtectedRoute>} />
          <Route path="/dashboard/judge" element={<StaffProtectedRoute><JudgeDashboardPage /></StaffProtectedRoute>} />
          <Route path="/dashboard/admin" element={<AdminProtectedRoute><AdminDashboardPage /></AdminProtectedRoute>} />
          <Route path="/dashboard/admin/screening" element={<AdminProtectedRoute><ScreeningAgentPage /></AdminProtectedRoute>} />
          <Route path="/dashboard/admin/operations" element={<AdminProtectedRoute><PlatformOperationsPage /></AdminProtectedRoute>} />
          <Route path="/dashboard/admin/events" element={<AdminProtectedRoute><EventManagementPage /></AdminProtectedRoute>} />
          <Route path="/dashboard/host" element={<HostProtectedRoute><HostDashboardPage /></HostProtectedRoute>} />
          <Route path="/dashboard/host/screening" element={<HostProtectedRoute><ScreeningAgentPage /></HostProtectedRoute>} />
          <Route path="/dashboard/host/operations" element={<HostProtectedRoute><PlatformOperationsPage /></HostProtectedRoute>} />
          <Route path="/boards" element={<ProtectedRoute><HackathonBoardsPage /></ProtectedRoute>} />
          <Route path="/boards/:hackathonId" element={<ProtectedRoute><HackathonBoardsPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProjectGalleryPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/invite/:kind/:token" element={<InviteAcceptPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
