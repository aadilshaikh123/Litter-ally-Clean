import { useAuth } from "../context/AuthContext";
import { Button, Card, CardBody } from "../components/ui";

/** Holding screen for accounts that exist but are not usable yet.
 *  Staff sign in with Google as ordinary citizens and wait here until an
 *  admin assigns their role and ward. */
export default function Pending() {
  const { profile, signOut, refreshProfile } = useAuth();
  const suspended = profile?.status === "suspended";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted px-4">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4 text-center">
          <div className="text-3xl" aria-hidden="true">{suspended ? "\u26D4" : "\u23F3"}</div>
          <h1 className="text-lg font-bold text-content">
            {suspended ? "Account suspended" : "Waiting for approval"}
          </h1>
          <p className="text-sm text-content-muted">
            {suspended
              ? "Your access has been suspended. Contact an administrator if you think this is a mistake."
              : "Your account is set up but has not been activated yet. An administrator needs to assign your role and ward before you can continue."}
          </p>
          {profile?.email && (
            <p className="text-xs text-content-subtle">Signed in as {profile.email}</p>
          )}
          <div className="flex justify-center gap-2">
            {!suspended && (
              <Button variant="secondary" onClick={refreshProfile}>Check again</Button>
            )}
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
