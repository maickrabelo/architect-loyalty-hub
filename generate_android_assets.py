from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src' / 'assets' / 'logo-conexao.png'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
BACKGROUND = (244, 239, 232)

logo = Image.open(SOURCE).convert('RGBA')

sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

for density, size in sizes.items():
    icon = logo.copy()
    icon.thumbnail((int(size * 0.78), int(size * 0.78)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (size, size), BACKGROUND)
    canvas.paste(icon, ((size - icon.width) // 2, (size - icon.height) // 2), icon)
    for name in ('ic_launcher.png', 'ic_launcher_round.png'):
        canvas.save(RES / f'mipmap-{density}' / name, format='PNG', optimize=True)

    foreground = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    foreground_logo = logo.copy()
    foreground_logo.thumbnail((int(size * 0.76), int(size * 0.76)), Image.Resampling.LANCZOS)
    foreground.paste(foreground_logo, ((size - foreground_logo.width) // 2, (size - foreground_logo.height) // 2), foreground_logo)
    foreground.save(RES / f'mipmap-{density}' / 'ic_launcher_foreground.png', format='PNG', optimize=True)

splash_sizes = {
    'drawable/splash.png': (480, 320),
    'drawable-port-mdpi/splash.png': (320, 480),
    'drawable-port-hdpi/splash.png': (480, 800),
    'drawable-port-xhdpi/splash.png': (720, 1280),
    'drawable-port-xxhdpi/splash.png': (960, 1600),
    'drawable-port-xxxhdpi/splash.png': (1280, 1920),
    'drawable-land-hdpi/splash.png': (800, 480),
    'drawable-land-mdpi/splash.png': (480, 320),
    'drawable-land-xhdpi/splash.png': (1280, 720),
    'drawable-land-xxhdpi/splash.png': (1600, 960),
    'drawable-land-xxxhdpi/splash.png': (1920, 1280),
}

for relative_path, (width, height) in splash_sizes.items():
    splash = Image.new('RGB', (width, height), BACKGROUND)
    splash_logo = logo.copy()
    splash_logo.thumbnail((int(min(width, height) * 0.42), int(min(width, height) * 0.42)), Image.Resampling.LANCZOS)
    splash.paste(splash_logo, ((width - splash_logo.width) // 2, (height - splash_logo.height) // 2), splash_logo)
    splash.save(RES / relative_path, format='PNG', optimize=True)

print('Generated Android launcher icons and splash screens')
