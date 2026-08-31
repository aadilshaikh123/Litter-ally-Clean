import { Badge, Card, CardBody, StatusPill } from "./ui";

const fmt = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

/** One complaint, used by every dashboard. Previously each screen rebuilt this
 *  markup from scratch with its own colours. */
export default function ComplaintCard({ complaint, imageUrl, proofUrl, children }) {
  const c = complaint;

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={c.status} />
          {c.ward && <Badge tone="info">Ward {c.ward.ward_no} &middot; {c.ward.name}</Badge>}
          {c.zone && (
            // Generated boundaries are labelled so nobody mistakes them for
            // surveyed municipal data.
            <Badge tone={c.zone.is_synthetic ? "warn" : "neutral"}>
              {c.zone.name}{c.zone.is_synthetic ? " (auto)" : ""}
            </Badge>
          )}
          <span className="ml-auto text-xs text-content-subtle">{fmt(c.created_at)}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <div className="space-y-2">
            {imageUrl ? (
              <img src={imageUrl} alt="Reported litter"
                   loading="lazy"
                   className="aspect-[4/3] w-full rounded-xl border border-line object-cover" />
            ) : (
              <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-surface-muted" />
            )}
            {proofUrl && (
              <div>
                <p className="mb-1 text-xs font-medium text-content-muted">After cleanup</p>
                <img src={proofUrl} alt="Cleanup proof" loading="lazy"
                     className="aspect-[4/3] w-full rounded-xl border border-line object-cover" />
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-2 text-sm">
            {c.description && <p className="text-content">{c.description}</p>}

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-content-subtle">Litter confidence</dt>
              <dd className="font-semibold text-content">
                {Number(c.garbage_probability).toFixed(1)}%
              </dd>

              <dt className="text-content-subtle">Coordinates</dt>
              <dd className="font-mono text-content">
                {Number(c.lat).toFixed(5)}, {Number(c.lng).toFixed(5)}
              </dd>

              {c.cleanup_distance_m != null && (
                <>
                  <dt className="text-content-subtle">Proof distance</dt>
                  <dd className="text-content">{Math.round(c.cleanup_distance_m)}m</dd>
                </>
              )}
            </dl>

            {c.si_instructions && (
              <div className="rounded-lg bg-surface-muted p-2">
                <p className="text-xs font-semibold text-content-muted">Instructions</p>
                <p className="text-sm text-content">{c.si_instructions}</p>
              </div>
            )}

            {children}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
