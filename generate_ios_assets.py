from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "assets" / "logo-conexao.png"
ICON_TARGET = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png"
SPLASH_DIR = ROOT / "ios" / "App" / "App" / "Assets.xcassets" / "Splash.imageset"

BACKGROUND = (244, 239, 232)

logo = Image.open(SOURCE).convert("RGBA")

icon_logo = logo.copy()
icon_logo.thumbnail((920, 920), Image.Resampling.LANCZOS)
icon_canvas = Image.new("RGB", (1024, 1024), BACKGROUND)
icon_position = ((1024 - icon_logo.width) // 2, (1024 - icon_logo.height) // 2)
icon_canvas.paste(icon_logo, icon_position, icon_logo)
icon_canvas.save(ICON_TARGET, format="PNG", optimize=True)
print(f"Generated {ICON_TARGET} (1024x1024, RGB)")

for filename, size in {
    "splash-2732x2732-2.png": 2732,
    "splash-2732x2732-1.png": 2732,
    "splash-2732x2732.png": 2732,
}.items():
    splash_logo = logo.copy()
    splash_logo.thumbnail((650, 650), Image.Resampling.LANCZOS)
    splash_canvas = Image.new("RGB", (size, size), BACKGROUND)
    splash_position = ((size - splash_logo.width) // 2, (size - splash_logo.height) // 2)
    splash_canvas.paste(splash_logo, splash_position, splash_logo)
    splash_canvas.save(SPLASH_DIR / filename, format="PNG", optimize=True)
    print(f"Generated {SPLASH_DIR / filename} ({size}x{size}, RGB)")
