import { Navigate, useLocation } from "react-router-dom";

export default function LegacyCommunityRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/dashboard/community", search, hash }} replace />;
}
