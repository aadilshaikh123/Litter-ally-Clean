import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { wardComplaints, muqaddamRoster, forwardComplaint } from "../lib/api";
import { useSignedImages } from "../lib/useSignedImages";
import ComplaintCard from "../components/ComplaintCard";
import {
  Alert, Badge, Button, EmptyState, Field, Input, Select, Spinner,
} from "../components/ui";

const TABS = [
  { key: "pending", label: "New", statuses: ["pending"] },
  { key: "active", label: "Forwarded", statuses: ["forwarded", "in_progress"] },
  { key: "done", label: "Completed", statuses: ["completed"] },
];

/**
 * Ward supervisor queue.
 *
 * RLS scopes every query to the supervisor's own ward, so there is no
 * client-side ward filter that could be wrong or bypassed. The "Forwarded" tab
 * works because it reads a real status value - the old version filtered on
 * `forwardedBySI`, a field that was never on the schema, so it always returned
 * an empty list.
 */
export default function SupervisorDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Draft state is keyed per complaint. The old dashboard kept one shared
  // value, so choosing a muqaddam on one card visibly changed every card.
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    const { statuses } = TABS.find((t) => t.key === tab);
    wardComplaints(statuses)
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          setRows(data ?? []);
          setError(null);
        }
      })
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!profile?.ward_id) return;
    muqaddamRoster(profile.ward_id).then(({ data }) => setRoster(data ?? []));
  }, [profile?.ward_id]);

  const urls = useSignedImages(rows);

  const setDraft = (id, patch) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const forward = async (id) => {
    const draft = drafts[id] ?? {};
    if (!draft.muqaddamId) {
      setError("Choose a muqaddam to forward to.");
      return;
    }

    setSaving((s) => ({ ...s, [id]: true }));
    const { error: err } = await forwardComplaint(
      id,
      draft.muqaddamId,
      draft.instructions?.trim() || null,
    );
    setSaving((s) => ({ ...s, [id]: false }));

    if (err) {
      setError(err.message);
      return;
    }
    setDrafts((d) => ({ ...d, [id]: undefined }));
    setRows((r) => r.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-content">Ward queue</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-content-muted">
          <span>Signed in as {profile?.identifier ?? profile?.role}</span>
          {profile?.ward_id == null && <Badge tone="warn">No ward assigned</Badge>}
        </p>
      </div>

      <div className="flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={[
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-brand-600 text-brand-700 dark:text-brand-300"
                : "border-transparent text-content-muted hover:text-content",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Alert title="Something went wrong">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing here">
          {tab === "pending"
            ? "No new reports in your ward right now."
            : "No complaints in this state."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              imageUrl={urls[c.image_path]}
              proofUrl={urls[c.post_cleaning_path]}
            >
              {tab === "pending" && (
                <div className="space-y-2 border-t border-line pt-3">
                  <Field label="Forward to muqaddam">
                    {(p) => (
                      <Select
                        {...p}
                        value={drafts[c.id]?.muqaddamId ?? ""}
                        onChange={(e) => setDraft(c.id, { muqaddamId: e.target.value })}
                      >
                        <option value="">Select a muqaddam</option>
                        {roster.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name || m.email}
                            {m.identifier ? " - " + m.identifier : ""}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>

                  <Field label="Instructions" hint="Optional">
                    {(p) => (
                      <Input
                        {...p}
                        value={drafts[c.id]?.instructions ?? ""}
                        placeholder="e.g. Needs a truck, not just a sweeper"
                        onChange={(e) => setDraft(c.id, { instructions: e.target.value })}
                      />
                    )}
                  </Field>

                  <Button size="sm" loading={saving[c.id]} onClick={() => forward(c.id)}>
                    Forward
                  </Button>

                  {roster.length === 0 && (
                    <p className="text-xs text-content-subtle">
                      No muqaddams are assigned to this ward yet.
                    </p>
                  )}
                </div>
              )}
            </ComplaintCard>
          ))}
        </div>
      )}
    </div>
  );
}
