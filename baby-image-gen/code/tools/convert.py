# convert.py
# writes png images in the images/ directory into a single simplified binary of 32x32 rgb images

from PIL import Image
import numpy as np
import glob

files = sorted(glob.glob("images/*.png"))

images = []

for path in files:
    img = Image.open(path).convert("RGBA")

    # create white background
    bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    img = Image.alpha_composite(bg, img)

    # convert to RGB
    img = img.convert("RGB")
    img = img.resize((32, 32), Image.BILINEAR)

    arr = np.asarray(img).astype(np.float32) / 255.0
    images.append(arr.flatten())

data = np.concatenate(images)

with open("emojis.bin", "wb") as f:
    data.tofile(f)

print("wrote emojis.bin with", len(files), "images")
