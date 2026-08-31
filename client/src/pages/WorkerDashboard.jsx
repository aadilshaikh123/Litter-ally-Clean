import { useEffect, useState } from "react";
import { myTasks } from "../lib/api";
import { useSignedImages } from "../lib/useSignedImages";
import ComplaintCard from "../components/ComplaintCard";
import { Alert, EmptyState, Spinner } from "../components/ui";

/**
 * Worker task list.
 *
 * The old version was unstyled raw HTML using <br/> for layout, with an
 * unlabelled select and file input, and its upload button posted to
 * /api/complaints/:id/complete - a route that did not exist, so the flow was
 * broken end to end.
 *
 * Cleanup proof is submitted by the muqaddam, who is the one accountable for
 * the verification, so this screen is read-only by design.
 */
export default function WorkerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    myTasks()
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else setTasks((data ?? []).filter((t) => t.complaint));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const urls = useSignedImages(tasks.map((t) => t.complaint));

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading your tasks" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-content">My tasks</h1>
        <p className="mt-1 text-sm text-content-muted">
          Locations assigned to you for clearing.
        </p>
      </div>

      {error && <Alert title="Could not load tasks">{error}</Alert>}

      {tasks.length === 0 ? (
        <EmptyState title="No tasks assigned">
          Your muqaddam will assign locations here.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <ComplaintCard
              key={t.id}
              complaint={t.complaint}
              imageUrl={urls[t.complaint.image_path]}
            >
              <a
                className="inline-block text-sm font-medium text-brand-700 underline dark:text-brand-300"
                href={`https://www.google.com/maps/search/?api=1&query=${t.complaint.lat},${t.complaint.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Maps
              </a>
            </ComplaintCard>
          ))}
        </div>
      )}
    </div>
  );
}
