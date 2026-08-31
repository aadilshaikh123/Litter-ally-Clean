import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { uploadImage, submitReport } from "../lib/api";
import { getPosition } from "../lib/geo";
import ImageCapture from "../components/ImageCapture";
import { Alert, Button, Card, CardBody, Field, Textarea, Badge } from "../components/ui";

const STAGE_LABEL = {
  uploading: "Uploading photo\u2026",
  classifying: "Checking the photo\u2026",
};

export default function Report() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [stage, setStage] = useState(null);
  const [error, setError] = useState(null);
  const [slow, setSlow] = useState(false);

  const busy = stage !== null;

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      setPosition(await getPosition());
    } catch (e) {
      setError(e.message);
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!file) return setError("Add a photo of the litter.");
    if (!position) return setError("Share your location so the report reaches the right ward.");

    // The classifier may be a sleeping free-tier Space; warn rather than
    // showing a spinner that looks hung.
    const slowTimer = setTimeout(() => setSlow(true), 6000);

    try {
      setStage("uploading");
      const path = await uploadImage("reports", file, user.id);

      setStage("classifying");
      const result = await submitReport({
        storage_path: path,
        lat: position.lat,
        lng: position.lng,
        description: description.trim() || null,
      });

      navigate("/my-reports", { state: { justSubmitted: result.complaint?.id } });
    } catch (e) {
      setError(e.message);
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setStage(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-content">Report litter</h1>
        <p className="mt-1 text-sm text-content-muted">
          Take a photo of the rubbish itself, as close as is safe.
        </p>
      </div>

      {error && <Alert title="Could not submit">{error}</Alert>}

      <Card>
        <CardBody>
          <form onSubmit={submit} className="space-y-5">
            <ImageCapture file={file} onChange={setFile} disabled={busy} />

            <div className="space-y-2">
              <span className="block text-sm font-medium text-content">Location</span>
              {position ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">
                    {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                  </Badge>
                  {position.accuracy && (
                    <span className="text-xs text-content-subtle">
                      &plusmn;{Math.round(position.accuracy)}m
                    </span>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={locate} disabled={busy}>
                    Update
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="secondary" onClick={locate}
                        loading={locating} disabled={busy} className="w-full">
                  Use my current location
                </Button>
              )}
            </div>

            <Field label="Description" hint="Optional. What is there, and how much?">
              {(p) => (
                <Textarea
                  {...p}
                  value={description}
                  maxLength={2000}
                  disabled={busy}
                  placeholder="e.g. Overflowing bin outside the school gate"
                  onChange={(e) => setDescription(e.target.value)}
                />
              )}
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={busy}
                    disabled={!file || !position}>
              {busy ? STAGE_LABEL[stage] : "Submit report"}
            </Button>

            {slow && (
              <p className="text-center text-xs text-content-subtle">
                The classifier is waking up. This first check can take up to a minute.
              </p>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
