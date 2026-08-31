import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./ui";

/** Route guard. The old app had none - all nine routes were public, so every
 *  dashboard was reachable by URL and simply failed its data fetches.
 *
 *  This is convenience, not security: RLS is what actually protects the data. */
export default function ProtectedRoute({ allow, children }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" label="Checking your session" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Signed in but the profile row hasn't been created yet, or staff awaiting
  // approval - both land on the holding screen rather than an empty dashboard.
  if (!profile || profile.status === "pending") return <Navigate to="/pending" replace />;
  if (profile.status === "suspended") return <Navigate to="/pending" replace />;

  if (allow && !allow.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
