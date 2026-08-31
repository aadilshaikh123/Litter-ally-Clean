---
title: Litter-ally Clean CLIP
emoji: "\U0001F6AE"
colorFrom: green
colorTo: blue
sdk: gradio
sdk_version: 6.26.0
app_file: app.py
pinned: false
---

# CLIP inference service

Zero-shot street-cleanliness classifier. Stateless: image in, probabilities out.

Deployed as a **Gradio** Space because Docker Spaces require a paid plan.
Gradio runs on FastAPI underneath, so the real API is mounted as plain HTTP
routes and the browser UI is only a manual sanity check.

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness / wake-up ping. No inference. |
| `/predict` | POST | `multipart/form-data` with an `image` field. |
| `/` | GET | Gradio demo UI. |

`/predict` requires an `X-Service-Secret` header matching the
`CLIP_SERVICE_SECRET` Space secret. If that variable is unset the check is
skipped (local dev only).

Response is percentages:

```json
{
  "clean_street_probability": 12.4,
  "garbage_probability": 84.1,
  "not_street_probability": 3.5,
  "prediction": "a street with garbage and litter"
}
```

Thresholds are deliberately **not** applied here - they live in
`supabase/functions/_shared/thresholds.ts`, so there is one source of truth.

## Local run

```bash
pip install -r requirements.txt
python app.py            # http://localhost:7860
pytest tests/            # downloads ~605MB of weights on first run
```
