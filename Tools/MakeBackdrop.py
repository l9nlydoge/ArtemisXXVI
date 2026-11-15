import math
import random
import sys
from pathlib import Path
from PIL import Image, ImageEnhance

Root = Path(__file__).resolve().parent
DayFile = Root / 'Source' / 'EarthDay.jpg'
NightFile = Root / 'Source' / 'EarthNight.jpg'
Target = Path(sys.argv[1]) if len(sys.argv) > 1 else Root.parent / 'public' / 'Backdrop'

Hex = lambda value: tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))
Night = [Hex(c) for c in ('#070b1a', '#0e1630', '#1b2a4e')]
Ocean = [Hex(c) for c in ('#173a73', '#1f5aa8', '#3b7dd8', '#7db8f2')]
Cloud = [Hex(c) for c in ('#c5d2e0', '#eef3f7', '#ffffff')]
Land = [Hex(c) for c in ('#1f4d2c', '#3a7a3a', '#6aa84f', '#c9a45c', '#8a6a3a')]
Dusk = [Hex('#6b4410')]
Surface = Night + Ocean + Cloud + Land + Dusk
Maps = (('EarthMapLarge', 1600), ('EarthMapMedium', 800), ('EarthMapSmall', 400))
CloudSeed = 26


def Distance(a, b):
    return 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2


Memo = {}


def Quantise(colour):
    key = (colour[0] >> 2, colour[1] >> 2, colour[2] >> 2)
    if key in Memo:
        return Memo[key]
    ranked = sorted(range(len(Surface)), key=lambda at: Distance(colour, Surface[at]))
    first, second = ranked[0], ranked[1]
    a, b = Surface[first], Surface[second]
    axis = [b[i] - a[i] for i in range(3)]
    length = sum(v * v for v in axis) or 1
    along = sum((colour[i] - a[i]) * axis[i] for i in range(3)) / length
    share = min(0.5, max(0.0, (along - 0.22) / 0.28 * 0.5))
    Memo[key] = (first, second, round(share * 16))
    return Memo[key]


def Noise(width, height, cells, stretch, seed):
    generator = random.Random(seed)
    columns = max(2, round(cells * stretch))
    rows = max(2, cells)
    small = Image.new('L', (columns, rows))
    small.putdata([generator.randrange(256) for _ in range(columns * rows)])
    tiled = Image.new('L', (columns * 3, rows))
    for at in range(3):
        tiled.paste(small, (at * columns, 0))
    big = tiled.resize((width * 3, height), Image.BICUBIC)
    return big.crop((width, 0, width * 2, height))


def Clouds(width, height):
    octaves = [(6, 3.2, 0.42), (12, 3.0, 0.24), (24, 2.6, 0.16), (48, 2.4, 0.1), (96, 2.2, 0.08)]
    layers = [Noise(width, height, cells, stretch, CloudSeed + at).load() for at, (cells, stretch, _) in enumerate(octaves)]
    weights = [weight for _, _, weight in octaves]
    field = Image.new('L', (width, height))
    data = field.load()
    for y in range(height):
        latitude = 90 - (y + 0.5) * 180 / height
        band = abs(latitude)
        cover = 0.4 + 0.1 * math.exp(-((band - 4) / 7) ** 2) + 0.12 * math.exp(-((band - 55) / 14) ** 2) - 0.12 * math.exp(-((band - 24) / 9) ** 2)
        cover -= 0.25 if band > 72 else 0
        for x in range(width):
            value = sum(layer[x, y] * weight for layer, weight in zip(layers, weights)) / 255
            density = (value - (1 - cover)) / 0.07
            data[x, y] = max(0, min(255, round(density * 255)))
    return field


def Day(width, height):
    day = Image.open(DayFile).convert('RGB').resize((width, height), Image.BOX)
    day = ImageEnhance.Color(day).enhance(1.35).point(lambda v: round(255 * (v / 255) ** 0.78))
    return day


def Lights(width, height):
    night = Image.open(NightFile).convert('L').resize((width, height), Image.BOX)
    return night.load()


def MakeMap(name, width):
    height = width // 2
    day = Day(width, height).load()
    clouds = Clouds(width, height).load()
    lights = Lights(width, height)
    generator = random.Random(width)
    image = Image.new('RGB', (width, height))
    out = image.load()
    for y in range(height):
        for x in range(width):
            colour = day[x, y]
            alpha = clouds[x, y] / 255
            if alpha > 0:
                tone = (232, 238, 244) if alpha > 0.55 else (196, 210, 224)
                colour = tuple(round(colour[i] * (1 - alpha) + tone[i] * alpha) for i in range(3))
            first, second, share = Quantise(colour)
            lit = 1 if lights[x, y] > 70 and alpha < 0.4 and generator.random() < 0.55 else 0
            out[x, y] = (first * 16 + second, share * 16 + lit, 0)
    image.save(Target / f'{name}.png', optimize=True)
    print(name, image.size)
    return image


def Main():
    Target.mkdir(parents=True, exist_ok=True)
    for name, width in Maps:
        MakeMap(name, width)


Main()
