import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  muqaddamComplaints, uploadImage, verifyCleanup, workerRoster, assignWorker,
} from "../lib/api";
import { getPosition } from "../lib/geo";
import { useSignedImages } from "../lib/useSignedImages";
import ComplaintCard from "../components/ComplaintCard";
import ImageCapture from "../components/ImageCapture";
import {
  Alert, Badge, Button, EmptyState, Field, Select, Spinner,
} from "../components/ui";

/**
 * Muqaddam view: the complaints assigned to me, and the cleanup proof flow.
 *
 * Each card owns its own state object. The old version stored both a string
 * and an object in the same slot, so the loading state never rendered and the
 * failure message never appeared.
 */
export default function MuqaddamDashboard() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState({});

  const load = useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    muqaddamComplaints(user.id)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else {
          setRows(data ?? []);
          setError(null);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!profile?.ward_id) return;
    workerRoster(profile.ward_id).then(({ data }) => setWorkers(data ?? []));
  }, [profile?.ward_id]);

  const urls = useSignedImages(rows);

  const patch = (id, next) =>
    setCards((c) => ({ ...c, [id]: { ...c[id], ...next } }));

  const submitProof = async (complaint) => {
    const card = cards[complaint.id] ?? {};
    if (!card.file) return patch(complaint.id, { error: "Add a photo of the cleared area." });

    patch(complaint.id, { busy: "locating", error: null });

    try {
      const pos = await getPosition();

      patch(complaint.id, { busy: "uploading" });
      const path = await uploadImage("cleanup-proofs", card.file, user.id);

      patch(complaint.id, { busy: "verifying" });
      await verifyCleanup({
        complaint_id: complaint.id,
        storage_path: path,
        lat: pos.lat,
        lng: pos.lng,
      });

      patch(complaint.id, { busy: null, file: null });
      setRows((r) => r.filter((c) => c.id !== complaint.id));
    } catch (e) {
      patch(complaint.id, { busy: null, error: e.message });
    }
  };

  const assign = async (complaintId, workerId) => {
    if (!workerId) return;
    const { error: err } = await assignWorker(complaintId, workerId, null);
    if (err) patch(complaintId, { error: err.message });
    else patch(complaintId, { assigned: true, error: null });
  };

  const BUSY_LABEL = {
    locating: "Getting your location…",
    uploading: "Uploading photo…",
    verifying: "Verifying cleanup…",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading assigned complaints" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-content">Assigned to me</h1>
        <p className="mt-1 text-sm text-content-muted">
          Clear the area, then photograph it from the same spot to close the report.
        </p>
      </div>

      {error && <Alert title="Could not load">{error}</Alert>}

      {rows.length === 0 ? (
        <EmptyState title="Nothing assigned">
          Complaints forwarded to you by your supervisor will appear here.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => {
            const card = cards[c.id] ?? {};
            return (
              <ComplaintCard key={c.id} complaint={c} imageUrl={urls[c.image_path]}>
                <div className="space-y-3 border-t border-line pt-3">
                  {workers.length > 0 && (
                    <Field label="Assign a worker" hint="Optional">
                      {(p) => (
                        <Select
                          {...p}
                          defaultValue=""
                          onChange={(e) => assign(c.id, e.target.value)}
                        >
                          <option value="">Select a worker</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.full_name || w.email}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  )}

                  {card.assigned && <Badge tone="brand">Worker assigned</Badge>}

                  <ImageCapture
                    label="Cleanup proof"
                    file={card.file ?? null}
                    disabled={!!card.busy}
                    onChange={(f) => patch(c.id, { file: f, error: null })}
                  />

                  {card.error && <Alert>{card.error}</Alert>}

                  <Button
                    className="w-full"
                    loading={!!card.busy}
                    disabled={!card.file}
                    onClick={() => submitProof(c)}
                  >
                    {card.busy ? BUSY_LABEL[card.busy] : "Submit cleanup proof"}
                  </Button>

                  <p className="text-xs text-content-subtle">
                    The photo must be taken within 30m of the original report, and the
                    area must look clear.
                  </p>
                </div>
              </ComplaintCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
