FROM python:3.11-slim

# HF Spaces runs the container as uid 1000 with only /home/user writable.
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR /app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user app.py .

USER user

# Bake the weights into the image so container start doesn't wait on a
# ~605MB download. Without this every cold start pays for the fetch.
RUN python -c "\
from transformers import CLIPModel, CLIPProcessor; \
CLIPModel.from_pretrained('openai/clip-vit-base-patch32'); \
CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')"

EXPOSE 7860

# One worker on purpose: each would load its own ~600MB copy of the model.
# Threads give concurrency instead; inference releases the GIL in torch.
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "1", "--threads", "4", \
     "--timeout", "120", "app:app"]
