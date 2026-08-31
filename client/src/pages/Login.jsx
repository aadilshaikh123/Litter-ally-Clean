import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, HOME_FOR_ROLE } from "../context/AuthContext";
import { Alert, Button, Card, CardBody, Spinner } from "../components/ui";

/** Google is the only sign-in method.
 *
 *  The old app had three registration screens and a homemade OTP flow that was
 *  never actually checked at registration, plus a public endpoint that let
 *  anyone make themselves a ward supervisor. All of it is gone. */
export default function Login() {
  const { session, profile, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center"><Spinner size="lg" /></div>;
  }
  if (session && profile) {
    return <Navigate to={HOME_FOR_ROLE[profile.role] ?? "/report"} replace />;
  }

  const handle = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted px-4">
      <Card className="w-full max-w-sm">
        <CardBody className="space-y-5 text-center">
          <div>
            <div className="text-3xl" aria-hidden="true">&#128682;</div>
            <h1 className="mt-2 text-xl font-bold text-content">Bin There, Done That</h1>
            <p className="mt-1 text-sm text-content-muted">
              Sign in to report litter or manage your ward.
            </p>
          </div>

          {error && <Alert>{error}</Alert>}

          <Button className="w-full" size="lg" loading={busy} onClick={handle}>
            Continue with Google
          </Button>

          <p className="text-xs text-content-subtle">
            Municipal staff: sign in here, then ask an administrator to assign
            your role and ward.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
