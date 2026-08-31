// Shared UI primitives.
//
// The old screens had none of this: the same submit button was retyped in full
// in six files, and each page picked its own palette. Everything below reads
// from the Tailwind theme tokens instead.

const cx = (...c) => c.filter(Boolean).join(" ");

/* ---------------------------------------------------------------- Button */

const VARIANTS = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/50",
  secondary: "bg-surface-raised text-content border border-line hover:bg-surface-muted",
  ghost: "text-content-muted hover:bg-surface-muted hover:text-content",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-600/50",
};

const SIZES = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  variant = "primary", size = "md", loading = false, className,
  children, disabled, ...props
}) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
        "transition-colors disabled:cursor-not-allowed",
        VARIANTS[variant], SIZES[size], className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- Spinner */

export function Spinner({ size = "md", label }) {
  const px = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" }[size];
  return (
    <span role="status" aria-live="polite">
      <svg className={cx(px, "animate-spin")} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label ?? "Loading"}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ Card */

export const Card = ({ className, ...p }) => (
  <div className={cx("rounded-2xl bg-surface-raised shadow-card border border-line", className)} {...p} />
);

export const CardBody = ({ className, ...p }) => (
  <div className={cx("p-4 sm:p-5", className)} {...p} />
);

/* ----------------------------------------------------------------- Field */

let uid = 0;
const nextId = () => `f${++uid}`;

export function Field({ label, hint, error, children, id }) {
  const fieldId = id ?? nextId();
  const describedBy = [hint && `${fieldId}-hint`, error && `${fieldId}-err`]
    .filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-content">
        {label}
      </label>
      {children({ id: fieldId, "aria-describedby": describedBy, "aria-invalid": !!error || undefined })}
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="text-xs text-content-subtle">{hint}</p>
      )}
      {error && (
        <p id={`${fieldId}-err`} className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-content " +
  "placeholder:text-content-subtle transition-colors focus:border-brand-500";

export const Input = ({ className, ...p }) => <input className={cx(CONTROL, className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={cx(CONTROL, "min-h-24 resize-y", className)} {...p} />;
export const Select = ({ className, ...p }) => <select className={cx(CONTROL, "appearance-none", className)} {...p} />;

/* ----------------------------------------------------------------- Badge */

const TONES = {
  neutral: "bg-surface-muted text-content-muted border-line",
  brand: "bg-brand-50 text-brand-800 border-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:border-brand-800",
  warn: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
  danger: "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",
  info: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800",
};

export const Badge = ({ tone = "neutral", className, ...p }) => (
  <span
    className={cx("inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold",
      TONES[tone], className)}
    {...p}
  />
);

const STATUS_TONE = {
  pending: "warn", forwarded: "info", in_progress: "info",
  completed: "brand", rejected: "danger",
};
const STATUS_LABEL = {
  pending: "Pending", forwarded: "Forwarded", in_progress: "In progress",
  completed: "Completed", rejected: "Rejected",
};

export const StatusPill = ({ status }) => (
  <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_LABEL[status] ?? status}</Badge>
);

/* ------------------------------------------------------------ EmptyState */

export const EmptyState = ({ title, children, action }) => (
  <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
    <p className="font-semibold text-content">{title}</p>
    {children && <p className="mx-auto mt-1 max-w-sm text-sm text-content-muted">{children}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

/* ----------------------------------------------------------------- Alert */

export const Alert = ({ tone = "danger", title, children }) => (
  <div
    role="alert"
    className={cx("rounded-xl border px-3 py-2.5 text-sm",
      tone === "danger"
        ? "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100"
        : "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-100")}
  >
    {title && <p className="font-semibold">{title}</p>}
    {children}
  </div>
);
