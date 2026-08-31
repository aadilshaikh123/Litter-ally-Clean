"""Stateless CLIP inference service.

One job: image in, three zero-shot probabilities out. No geo lookup, no
thresholds, no database - those live in Postgres and the Edge Functions
respectively, so there is exactly one place each rule is written down.
"""
import io
import os
import hmac

import torch
from flask import Flask, request, jsonify
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

app = Flask(__name__)


def _authorized(req) -> bool:
    """Constant-time check of the shared secret.

    The Space URL is public, so without this anyone can burn the free CPU quota.
    """
    if not SERVICE_SECRET:
        return True  # unset => local dev
    return hmac.compare_digest(req.headers.get("X-Service-Secret", ""), SERVICE_SECRET)


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


@app.get("/health")
def health():
    """Cheap liveness probe - no inference, used to wake a sleeping Space."""
    return jsonify({"status": "ok", "model": MODEL_NAME, "device": str(device)})


@app.post("/predict")
def predict():
    if not _authorized(request):
        return jsonify({"error": "unauthorized"}), 401

    file = request.files.get("image")
    if file is None:
        return jsonify({"error": "image is required"}), 400

    raw = file.read(MAX_IMAGE_BYTES + 1)
    if len(raw) > MAX_IMAGE_BYTES:
        return jsonify({"error": "image too large"}), 413

    try:
        # Hand the full-resolution image to the processor; it does the correct
        # resize + center-crop itself. Pre-resizing to 224x224 (as the original
        # did) squashes the aspect ratio before that and degrades the input.
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        return jsonify({"error": f"could not decode image: {exc}"}), 400

    return jsonify(classify(image))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 7860)))
