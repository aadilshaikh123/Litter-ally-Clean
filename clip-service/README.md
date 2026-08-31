---
title: Litter-ally Clean CLIP
emoji: 🚮
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# CLIP inference service

Zero-shot street-cleanliness classifier. Stateless: image in, probabilities out.

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness / wake-up ping. No inference. |
| `/predict` | POST | `multipart/form-data` with an `image` field. |

Requests need `X-Service-Secret` matching the `CLIP_SERVICE_SECRET` Space secret.
If that variable is unset the check is skipped (local dev only).

`/predict` returns percentages:

```json
{
  "clean_street_probability": 12.4,
  "garbage_probability": 84.1,
  "not_street_probability": 3.5,
  "prediction": "a street with garbage and litter"
}
```

Thresholds are deliberately **not** applied here - they live in
`supabase/functions/_shared/thresholds.ts` so there is one source of truth.

## Local run

```bash
pip install -r requirements.txt
python app.py           # http://localhost:7860
pytest tests/           # needs the model; downloads ~605MB on first run
```
