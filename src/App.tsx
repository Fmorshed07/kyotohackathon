import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { usePortalAuth } from "./hooks/usePortalAuth";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import AdminSignIn from "./pages/AdminSignIn";
import Dashboard from "./pages/Dashboard";
import ParticipantDashboardPage from "./pages/ParticipantDashboardPage";
import JudgeDashboardPage from "./pages/JudgeDashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function FullScreenMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function PublicOnlyRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();

  if (loading) {
    return <FullScreenMessage message="Loading..." />;
  }

  if (sessionUser) {
    if (sessionUser.role === "admin") {
      return <Navigate to="/dashboard/admin" replace />;
    }
    if (sessionUser.role === "judge") {
      if (sessionUser.judgeApprovalStatus === "pending") {
        return <Navigate to="/dashboard" replace />;
      }
      return <Navigate to="/dashboard/judge" replace />;
    }
    if (sessionUser.role === "participant") {
      return <Navigate to="/dashboard/participant" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { sessionUser, loading } = usePortalAuth();

  if (loading) {
    return <FullScreenMessage message="Loading..." />;
  }

  if (!sessionUser) {
    return <Navigate to="/signin" replace />;
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
          <Route
            path="/signin"
            element={
              <PublicOnlyRoute>
                <SignIn />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PublicOnlyRoute>
                <AdminSignIn />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/participant"
            element={
              <ProtectedRoute>
                <ParticipantDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/judge"
            element={
              <ProtectedRoute>
                <JudgeDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
