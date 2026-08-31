"""Stateless CLIP inference service.

One job: image in, three zero-shot probabilities out. No geo lookup, no
thresholds, no database - those live in Postgres and the Edge Functions
respectively, so there is exactly one place each rule is written down.

Deployed as a Hugging Face **Gradio** Space (Docker Spaces are PRO-only). The
real interface is the plain `POST /predict` route below; Gradio runs on FastAPI
underneath, so the JSON API and a small demo UI share one server on port 7860.
"""
import io
import os
import hmac

import gradio as gr
import torch
from fastapi import FastAPI, File, Header, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from transformers import CLIPModel, CLIPProcessor

MODEL_NAME = os.environ.get("CLIP_MODEL", "openai/clip-vit-base-patch32")

# Index order is part of the API contract - the Edge Functions read
# `garbage_probability`, which is PROMPTS[1]. Do not reorder.
PROMPTS = [
    "a clean street with no garbage",
    "a street with garbage and litter",
    "an image that is not a street scene",
]

MAX_IMAGE_BYTES = 10 * 1024 * 1024

SERVICE_SECRET = os.environ.get("CLIP_SERVICE_SECRET")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = CLIPModel.from_pretrained(MODEL_NAME).to(device).eval()
processor = CLIPProcessor.from_pretrained(MODEL_NAME)


def _features(out):
    """Projected embedding from get_text_features / get_image_features.

    transformers 4.x returns a bare tensor; 5.x returns a
    BaseModelOutputWithPooling whose pooler_output is the projected embedding.
    Verified against CLIPModel.forward: both paths reproduce logits_per_image
    to within 1e-5.
    """
    return out if torch.is_tensor(out) else out.pooler_output


def _normalize(t):
    return t / t.norm(p=2, dim=-1, keepdim=True)


# The three prompts never change, so the text tower is pure constant work.
# Encode once at boot and reuse; per request we only run the vision tower.
with torch.no_grad():
    _text_inputs = processor(text=PROMPTS, return_tensors="pt", padding=True)
    _text_features = _normalize(
        _features(model.get_text_features(**{k: v.to(device) for k, v in _text_inputs.items()}))
    )


def classify(image: Image.Image) -> dict:
    """Zero-shot classify one image against PROMPTS. Returns percentages."""
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        image_features = _normalize(
            _features(model.get_image_features(**{k: v.to(device) for k, v in inputs.items()}))
        )
        # Mirrors CLIPModel.forward: logits_per_image is the scaled dot product
        # of the L2-normalised image and text embeddings, so scores match the
        # full-model path the original code used.
        logits = model.logit_scale.exp() * (image_features @ _text_features.t())
        probs = logits.softmax(dim=1)[0]

    return {
        "clean_street_probability": probs[0].item() * 100,
        "garbage_probability": probs[1].item() * 100,
        "not_street_probability": probs[2].item() * 100,
        "prediction": PROMPTS[int(torch.argmax(probs).item())],
    }


# ---------------------------------------------------------------- HTTP API

api = FastAPI(title="Litter-ally Clean CLIP")


def _authorized(provided: str | None) -> bool:
    """Constant-time check of the shared secret.

    The Space URL is public, so without this anyone can burn the free CPU quota.
    """
    if not SERVICE_SECRET:
        return True  # unset => local dev
    return hmac.compare_digest(provided or "", SERVICE_SECRET)


@api.get("/health")
def health():
    """Cheap liveness probe - no inference, used to wake a sleeping Space."""
    return {"status": "ok", "model": MODEL_NAME, "device": str(device)}


@api.post("/predict")
async def predict(
    image: UploadFile = File(...),
    x_service_secret: str | None = Header(default=None),
):
    if not _authorized(x_service_secret):
        return JSONResponse({"error": "unauthorized"}, status_code=401)

    raw = await image.read(MAX_IMAGE_BYTES + 1)
    if len(raw) > MAX_IMAGE_BYTES:
        return JSONResponse({"error": "image too large"}, status_code=413)

    try:
        # Hand the full-resolution image to the processor; it does the correct
        # resize + center-crop itself. Pre-resizing to 224x224 (as the original
        # did) squashes the aspect ratio first and degrades the input.
        pil = Image.open(io.BytesIO(raw)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        return JSONResponse({"error": f"could not decode image: {exc}"}, status_code=400)

    return classify(pil)


# ------------------------------------------------------------- demo UI

def _ui_classify(img):
    if img is None:
        return {}
    scores = classify(img)
    return {
        "clean street": scores["clean_street_probability"] / 100,
        "garbage / litter": scores["garbage_probability"] / 100,
        "not a street": scores["not_street_probability"] / 100,
    }


demo = gr.Interface(
    fn=_ui_classify,
    inputs=gr.Image(type="pil", label="Street photo"),
    outputs=gr.Label(num_top_classes=3, label="Zero-shot CLIP"),
    title="Litter-ally Clean - CLIP classifier",
    description=(
        "Zero-shot street-cleanliness classifier. The app calls `POST /predict` "
        "directly; this page is just a manual check."
    ),
    flagging_mode="never",
)

# Gradio is mounted under the FastAPI app rather than the other way around, so
# /predict and /health stay plain HTTP routes and the Edge Function needs no
# knowledge of Gradio's queue protocol.
app = gr.mount_gradio_app(api, demo, path="/")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7860)))
