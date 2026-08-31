import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, HOME_FOR_ROLE } from "../context/AuthContext";
import { Spinner } from "../components/ui";

/** OAuth lands here. supabase-js parses the URL fragment itself
 *  (detectSessionInUrl), so this only has to wait and then route. */
export default function AuthCallback() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }
    if (!profile || profile.status !== "active") {
      navigate("/pending", { replace: true });
      return;
    }
    navigate(HOME_FOR_ROLE[profile.role] ?? "/report", { replace: true });
  }, [loading, session, profile, navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner size="lg" label="Signing you in" />
    </div>
  );
}
