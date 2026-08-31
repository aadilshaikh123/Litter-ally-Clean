"""Smoke tests for the CLIP classifier.

The service is a Gradio Space, so the unit under test is the `predict`
function itself rather than an HTTP route - that is exactly what Gradio exposes
as the `/predict` API endpoint and what the Edge Function calls.

Synthesises two crude images rather than committing fixtures: a grey road with
scattered bright specks (litter-ish) and a plain grey road. CLIP is zero-shot,
so we assert only the *ordering* the app depends on, never absolute scores -
those drift with the checkpoint.

Run: pytest clip-service/tests/   (downloads ~605MB of weights on first run)
"""
import random

import pytest
from PIL import Image, ImageDraw

import app as clip_app


def _road(litter: bool) -> Image.Image:
    img = Image.new("RGB", (640, 480), (105, 105, 105))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 640, 150], fill=(135, 160, 190))  # sky
    if litter:
        rng = random.Random(0)  # deterministic
        for _ in range(160):
            x, y = rng.randint(0, 639), rng.randint(160, 479)
            r = rng.randint(3, 11)
            d.ellipse([x, y, x + r, y + r],
                      fill=(rng.randint(180, 255), rng.randint(180, 255), rng.randint(90, 255)))
    return img


def test_returns_three_probabilities_summing_to_100():
    body = clip_app.predict(_road(True), clip_app.SERVICE_SECRET or "")
    total = (body["clean_street_probability"] + body["garbage_probability"]
             + body["not_street_probability"])
    assert total == pytest.approx(100.0, abs=0.01)
    assert body["prediction"] in clip_app.PROMPTS


def test_littered_scores_higher_garbage_than_clean():
    def garbage(img):
        return clip_app.predict(img, clip_app.SERVICE_SECRET or "")["garbage_probability"]

    assert garbage(_road(True)) > garbage(_road(False))


def test_missing_image_is_rejected():
    with pytest.raises(Exception):
        clip_app.predict(None, clip_app.SERVICE_SECRET or "")


def test_secret_is_enforced_when_configured(monkeypatch):
    monkeypatch.setattr(clip_app, "SERVICE_SECRET", "s3cret")

    with pytest.raises(Exception):
        clip_app.predict(_road(True), "wrong")

    body = clip_app.predict(_road(True), "s3cret")
    assert body["garbage_probability"] >= 0


def test_matches_full_model_path():
    """The manual two-tower computation must equal CLIPModel.forward.

    predict() runs the towers separately and applies logit_scale by hand. That
    is only valid if it reproduces what the original full-model call produced,
    so this pins the two together. It is also the regression test for the
    transformers 4.x -> 5.x return-type change: on 5.x get_text_features
    returns BaseModelOutputWithPooling rather than a bare tensor.
    """
    import torch

    image = _road(True)
    full = clip_app.processor(
        text=clip_app.PROMPTS, images=image, return_tensors="pt", padding=True,
    )
    with torch.no_grad():
        expected = clip_app.model(
            **{k: v.to(clip_app.device) for k, v in full.items()}
        ).logits_per_image.softmax(dim=1)[0]

    got = clip_app.predict(image, clip_app.SERVICE_SECRET or "")
    actual = [
        got["clean_street_probability"] / 100,
        got["garbage_probability"] / 100,
        got["not_street_probability"] / 100,
    ]

    for a, b in zip(actual, expected.tolist()):
        assert a == pytest.approx(b, abs=1e-5)


def test_accepts_gradio_filedata_dict(tmp_path):
    """API callers hit gr.api, which does NOT run component pre-processing.

    The image therefore arrives as the raw FileData dict pointing at whatever
    /gradio_api/upload wrote, not as a PIL image. Every earlier test passed a
    PIL image directly and used a wrong secret, so this path went unexercised
    until it failed in production with:

        TypeError: only a single or a list of entries is supported
                   but got type=<class 'dict'>
    """
    path = tmp_path / "upload.jpg"
    _road(True).save(path)

    payload = {"path": str(path), "meta": {"_type": "gradio.FileData"}}
    body = clip_app.predict(payload, clip_app.SERVICE_SECRET or "")

    assert body["prediction"] in clip_app.PROMPTS
    total = (body["clean_street_probability"] + body["garbage_probability"]
             + body["not_street_probability"])
    assert total == pytest.approx(100.0, abs=0.01)


def test_accepts_plain_path_string(tmp_path):
    path = tmp_path / "upload.jpg"
    _road(True).save(path)
    body = clip_app.predict(str(path), clip_app.SERVICE_SECRET or "")
    assert body["prediction"] in clip_app.PROMPTS
