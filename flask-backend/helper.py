from transformers import CLIPProcessor, CLIPModel
# ----- CONFIGURATION -----
model_name = "openai/clip-vit-base-patch32"
prompts = [
    "a clean street with no garbage",
    "a street with garbage and litter",
    "an image that is not a street scene"
]

# Load CLIP Model
model = CLIPModel.from_pretrained(model_name)
processor = CLIPProcessor.from_pretrained(model_name)