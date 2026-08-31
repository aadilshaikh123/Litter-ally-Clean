import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { myReports } from "../lib/api";
import { useSignedImages } from "../lib/useSignedImages";
import ComplaintCard from "../components/ComplaintCard";
import { Alert, Button, EmptyState, Spinner } from "../components/ui";

export default function MyReports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    myReports()
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else setRows(data ?? []);
      })
      // The old MyImages put setLoading(false) inside try only, so any fetch
      // error left the spinner running forever and the error state unreachable.
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const urls = useSignedImages(rows);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading your reports" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-content">My reports</h1>
        <Link to="/report">
          <Button size="sm">New report</Button>
        </Link>
      </div>

      {error && <Alert title="Could not load reports">{error}</Alert>}

      {!error && rows.length === 0 ? (
        <EmptyState
          title="No reports yet"
          action={
            <Link to="/report">
              <Button>Report litter</Button>
            </Link>
          }
        >
          Photograph litter near you and it will be routed to the ward team responsible.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              imageUrl={urls[c.image_path]}
              proofUrl={urls[c.post_cleaning_path]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
