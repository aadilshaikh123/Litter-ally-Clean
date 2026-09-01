import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth, HOME_FOR_ROLE } from "../context/AuthContext";
import { Button } from "./ui";

const NAV_BY_ROLE = {
  citizen: [
    { to: "/report", label: "Report" },
    { to: "/my-reports", label: "My reports" },
  ],
  safai_sevak: [{ to: "/worker", label: "My tasks" }],
  mukadam: [{ to: "/mukadam", label: "Assigned" }],
  inspector: [{ to: "/inspector", label: "Ward queue" }],
  admin: [
    { to: "/admin/users", label: "Users" },
    { to: "/inspector", label: "Complaints" },
  ],
};

/** Single source of nav truth. The old app decided navbar visibility twice -
 *  once in App.js's Layout and again inside Navbar.js with a hardcoded path
 *  list - and defined a :hover style in a JS object where it could never fire. */
export default function AppShell({ children }) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = NAV_BY_ROLE[role] ?? [];

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    [
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-100"
               : "text-content-muted hover:bg-surface-muted hover:text-content",
    ].join(" ");

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only-focusable absolute left-3 top-3 z-50 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to={HOME_FOR_ROLE[role] ?? "/"} className="flex items-center gap-2 font-bold text-content">
            <span aria-hidden="true">🚮</span>
            <span className="hidden sm:inline">Bin There, Done That</span>
            <span className="sm:hidden">BinThere</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <span className="hidden text-sm text-content-muted md:inline">
              {profile?.full_name || profile?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign out</Button>
            {links.length > 0 && (
              <button
                className="rounded-lg p-2 text-content-muted hover:bg-surface-muted sm:hidden"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label="Toggle navigation"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" className="border-t border-line px-4 py-2 sm:hidden" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>
                <span className="block py-1">{l.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
