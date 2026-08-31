"""Stateless CLIP inference service.

One job: image in, three zero-shot probabilities out. No geo lookup, no
thresholds, no database - those live in Postgres and the Edge Functions
respectively, so there is exactly one place each rule is written down.

Deployed as a Hugging Face **ZeroGPU** Gradio Space, which constrains the shape
of this file in three ways worth knowing before editing it:

1. ZeroGPU refuses to start a Space with no `@spaces.GPU` function, and it
   looks for one on the *Gradio graph* - so the decorated function has to be
   the one Gradio itself calls.
2. HF launches the `demo` object directly. Mounting Gradio under a FastAPI app
   and running uvicorn does not work: HF binds port 7860 first and the custom
   routes are never served.
3. Real CUDA only exists inside the decorated function, so both CLIP towers
   have to run in there.

The API is therefore a Gradio endpoint (`/gradio_api/call/predict`), called
from the Edge Function with @gradio/client.
"""
import hmac
import io
import os

import gradio as gr
import spaces
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

MODEL_NAME = os.environ.get("CLIP_MODEL", "openai/clip-vit-base-patch32")

# Index order is part of the API contract - the Edge Functions read
# `garbage_probability`, which is PROMPTS[1]. Do not reorder.
PROMPTS = [
    "a clean street with no garbage",
    "a street with garbage and litter",
    "an image that is not a street scene",
]

SERVICE_SECRET = os.environ.get("CLIP_SERVICE_SECRET")
ON_ZERO_GPU = os.environ.get("SPACES_ZERO_GPU", "").lower() in ("1", "true")

# ZeroGPU requires models placed on cuda at module level: a CUDA emulation mode
# is active outside @spaces.GPU functions so the placement succeeds, and real
# CUDA is swapped in inside them. Lazy .to('cuda') per call is much slower.
device = torch.device(os.environ.get("CLIP_DEVICE") or ("cuda" if ON_ZERO_GPU else "cpu"))

model = CLIPModel.from_pretrained(MODEL_NAME).to(device).eval()
processor = CLIPProcessor.from_pretrained(MODEL_NAME)

# Tokenised once - cheap, CPU-only, safe at import.
_TEXT_INPUTS = processor(text=PROMPTS, return_tensors="pt", padding=True)


def _features(out):
    """Projected embedding from get_text_features / get_image_features.

    transformers 4.x returns a bare tensor; 5.x returns a
    BaseModelOutputWithPooling whose pooler_output is the projected embedding.
    Verified against CLIPModel.forward: both reproduce logits_per_image to
    within 1e-5.
    """
    return out if torch.is_tensor(out) else out.pooler_output


def _normalize(t):
    return t / t.norm(p=2, dim=-1, keepdim=True)


def _scores(probs: list[float]) -> dict:
    return {
        "clean_street_probability": probs[0] * 100,
        "garbage_probability": probs[1] * 100,
        "not_street_probability": probs[2] * 100,
        "prediction": PROMPTS[max(range(3), key=probs.__getitem__)],
    }


def _to_pil(image) -> Image.Image:
    """Coerce whatever Gradio hands us into a PIL image.

    gr.api does NOT run component pre-processing: the UI path receives a PIL
    image (gr.Image(type="pil") converts it), but an API caller's argument
    arrives as the raw FileData dict {"path": ..., "meta": ...} pointing at the
    file the /gradio_api/upload step already wrote server-side.
    """
    if isinstance(image, Image.Image):
        return image
    if isinstance(image, str):
        return Image.open(image).convert("RGB")
    if isinstance(image, dict):
        src = image.get("path") or image.get("url")
        if not src:
            raise gr.Error("image payload has no path", print_exception=False)
        if src.startswith(("http://", "https://")):
            import urllib.request
            with urllib.request.urlopen(src, timeout=30) as resp:
                return Image.open(io.BytesIO(resp.read())).convert("RGB")
        return Image.open(src).convert("RGB")
    raise gr.Error(f"unsupported image payload: {type(image).__name__}", print_exception=False)


def _authorized(provided: str | None) -> bool:
    """Constant-time check of the shared secret.

    The Space is public, so without this anyone can burn the daily GPU quota.
    Passed as an argument rather than a header because a Gradio endpoint has no
    header plumbing.
    """
    if not SERVICE_SECRET:
        return True  # unset => local dev
    return hmac.compare_digest(provided or "", SERVICE_SECRET)


@spaces.GPU(duration=30)
def predict(image: dict, secret: str = "") -> dict:
    """Zero-shot classify one street photo. Returns percentages.

    This is the function ZeroGPU detects and the Edge Function calls.

    The `dict` hint is required (gr.api rejects untyped parameters) and is
    accurate for API callers, who send Gradio's FileData payload. The demo UI
    calls this function directly in Python with a PIL image, so _to_pil accepts
    both.
    """
    if not _authorized(secret):
        raise gr.Error("unauthorized", print_exception=False)
    if image is None:
        raise gr.Error("image is required", print_exception=False)

    pil = _to_pil(image)

    # Hand the full-resolution image to the processor; it does the correct
    # resize + center-crop itself. Pre-resizing to 224x224 (as the original
    # code did) squashes the aspect ratio first and degrades the input.
    inputs = processor(images=pil, return_tensors="pt")

    with torch.no_grad():
        text = _normalize(
            _features(model.get_text_features(**{k: v.to(device) for k, v in _TEXT_INPUTS.items()}))
        )
        img = _normalize(
            _features(model.get_image_features(pixel_values=inputs["pixel_values"].to(device)))
        )
        # Mirrors CLIPModel.forward: logits_per_image is the scaled dot product
        # of the L2-normalised embeddings, so scores match the full-model path.
        logits = model.logit_scale.exp() * (img @ text.t())
        probs = logits.softmax(dim=1)[0].tolist()

    return _scores(probs)


def _ui(image):
    """Demo UI wrapper - same GPU function, formatted for gr.Label."""
    if image is None:
        return {}
    s = predict(image, SERVICE_SECRET or "")
    return {
        "clean street": s["clean_street_probability"] / 100,
        "garbage / litter": s["garbage_probability"] / 100,
        "not a street": s["not_street_probability"] / 100,
    }


with gr.Blocks(title="Litter-ally Clean - CLIP") as demo:
    gr.Markdown(
        "# Litter-ally Clean - CLIP classifier\n"
        "Zero-shot street-cleanliness classifier. The app calls the `predict` "
        "API endpoint directly; this page is a manual check."
    )
    with gr.Row():
        inp = gr.Image(type="pil", label="Street photo")
        out = gr.Label(num_top_classes=3, label="Zero-shot CLIP")
    inp.change(_ui, inputs=inp, outputs=out)

    # The endpoint the Edge Function calls: /gradio_api/call/predict
    gr.api(predict, api_name="predict")

if __name__ == "__main__":
    demo.launch()
