import { Link } from "react-router-dom";
import { useAuth, HOME_FOR_ROLE } from "../context/AuthContext";
import { Button } from "../components/ui";

const STEPS = [
  { icon: "\u{1F4F7}", title: "Snap it", body: "Photograph litter on any Pune street. Your phone's GPS tags the spot." },
  { icon: "\u{1F916}", title: "We check it", body: "An image model confirms it is actually litter before a report is filed." },
  { icon: "\u{1F9F9}", title: "It gets cleared", body: "The report routes to the right ward supervisor, and cleanup is verified on site." },
];

export default function Landing() {
  const { session, role } = useAuth();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 font-bold">
          <span aria-hidden="true">&#128682;</span> Bin There, Done That
        </span>
        {session ? (
          <Link to={HOME_FOR_ROLE[role] ?? "/report"}>
            <Button size="sm">Open app</Button>
          </Link>
        ) : (
          <Link to="/login"><Button size="sm">Sign in</Button></Link>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-12 sm:py-20">
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-content sm:text-5xl">
            Report street litter.<br />
            <span className="text-brand-600">Watch it actually get cleared.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-content-muted">
            A civic reporting tool for Pune. Photograph rubbish, and it is routed to the
            ward team responsible, with the cleanup verified before it is marked done.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={session ? (HOME_FOR_ROLE[role] ?? "/report") : "/login"}>
              <Button size="lg">{session ? "Open app" : "Get started"}</Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-line bg-surface-raised p-5">
              <div className="text-2xl" aria-hidden="true">{s.icon}</div>
              <h2 className="mt-3 font-semibold text-content">{s.title}</h2>
              <p className="mt-1 text-sm text-content-muted">{s.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-content-subtle">
        Ward boundaries from Pune Municipal Corporation open data.
      </footer>
    </div>
  );
}
