from pathlib import Path
from PIL import Image

source = Path(__file__).resolve().parent
output = source.parents[2] / 'assets' / 'spin-arena' / 'cards-v61'
output.mkdir(parents=True, exist_ok=True)
for path in source.glob('*-source.png'):
    image = Image.open(path).convert('RGBA')
    image.thumbnail((640, 800), Image.Resampling.LANCZOS)
    image.save(output / path.name.replace('-source.png', '.webp'), quality=90, method=6)
