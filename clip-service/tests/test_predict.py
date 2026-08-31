"""Smoke test for the CLIP service.

Synthesises two crude images rather than committing fixtures: a grey road with
scattered bright specks (litter-ish) and a plain grey road (clean-ish). CLIP is
zero-shot, so we assert only the *ordering* the app depends on, never absolute
scores - those drift with the checkpoint.

Run: pytest clip-service/tests/   (downloads ~605MB of weights on first run)
"""
import io
import random

import pytest
from PIL import Image, ImageDraw

import app as clip_app


def _road(litter: bool) -> bytes:
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
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def client():
    clip_app.app.config["TESTING"] = True
    with clip_app.app.test_client() as c:
        yield c


def test_health_does_not_run_inference(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_predict_returns_three_probabilities_summing_to_100(client):
    r = client.post("/predict", data={"image": (io.BytesIO(_road(True)), "x.jpg")},
                    content_type="multipart/form-data")
    assert r.status_code == 200
    body = r.get_json()
    total = (body["clean_street_probability"] + body["garbage_probability"]
             + body["not_street_probability"])
    assert total == pytest.approx(100.0, abs=0.01)
    assert body["prediction"] in clip_app.PROMPTS


def test_littered_scores_higher_garbage_than_clean(client):
    def garbage(payload):
        r = client.post("/predict", data={"image": (io.BytesIO(payload), "x.jpg")},
                        content_type="multipart/form-data")
        return r.get_json()["garbage_probability"]

    assert garbage(_road(True)) > garbage(_road(False))


def test_missing_image_is_rejected(client):
    assert client.post("/predict", data={}, content_type="multipart/form-data").status_code == 400


def test_undecodable_image_is_rejected(client):
    r = client.post("/predict", data={"image": (io.BytesIO(b"not an image"), "x.jpg")},
                    content_type="multipart/form-data")
    assert r.status_code == 400


def test_secret_is_enforced_when_configured(client, monkeypatch):
    monkeypatch.setattr(clip_app, "SERVICE_SECRET", "s3cret")
    r = client.post("/predict", data={"image": (io.BytesIO(_road(True)), "x.jpg")},
                    content_type="multipart/form-data")
    assert r.status_code == 401

    r = client.post("/predict", data={"image": (io.BytesIO(_road(True)), "x.jpg")},
                    content_type="multipart/form-data",
                    headers={"X-Service-Secret": "s3cret"})
    assert r.status_code == 200


def test_matches_full_model_path():
    """The precomputed-text-embedding shortcut must equal CLIPModel.forward.

    classify() runs only the vision tower and reuses text features cached at
    boot. That is only valid if it reproduces what the original full-model call
    produced, so this pins the two together. It is also the regression test for
    the transformers 4.x -> 5.x return-type change: on 5.x get_text_features
    returns BaseModelOutputWithPooling rather than a bare tensor.
    """
    import torch
    from PIL import Image

    image = Image.open(io.BytesIO(_road(True))).convert("RGB")

    full = clip_app.processor(
        text=clip_app.PROMPTS, images=image, return_tensors="pt", padding=True,
    )
    with torch.no_grad():
        expected = clip_app.model(
            **{k: v.to(clip_app.device) for k, v in full.items()}
        ).logits_per_image.softmax(dim=1)[0]

    got = clip_app.classify(image)
    actual = [
        got["clean_street_probability"] / 100,
        got["garbage_probability"] / 100,
        got["not_street_probability"] / 100,
    ]

    for a, b in zip(actual, expected.tolist()):
        assert a == pytest.approx(b, abs=1e-5)
