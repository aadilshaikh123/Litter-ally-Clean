import { useEffect, useState } from "react";
import { signedUrls } from "./api";

/** Batch-sign the private storage objects for a list of complaints.
 *  One request per bucket instead of one per image. */
export function useSignedImages(complaints) {
  const [urls, setUrls] = useState({});

  const reportKey = complaints.map((c) => c.image_path).filter(Boolean).join(",");
  const proofKey = complaints.map((c) => c.post_cleaning_path).filter(Boolean).join(",");

  useEffect(() => {
    let active = true;
    const reports = reportKey ? reportKey.split(",") : [];
    const proofs = proofKey ? proofKey.split(",") : [];

    Promise.all([
      signedUrls("reports", reports),
      signedUrls("cleanup-proofs", proofs),
    ]).then(([a, b]) => {
      if (active) setUrls({ ...a, ...b });
    });

    return () => { active = false; };
  }, [reportKey, proofKey]);

  return urls;
}
