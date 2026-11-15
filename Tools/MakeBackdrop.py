import sys
from pathlib import Path
from PIL import Image, ImageEnhance

Root = Path(__file__).resolve().parent
Source = Root / 'Source' / 'GlobeStill.jpg'
Target = Path(sys.argv[1]) if len(sys.argv) > 1 else Root.parent / 'public' / 'Backdrop'
SourceCentre = 1060
SourceRadius = 1004

Hex = lambda value: tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))
Night = [Hex(c) for c in ('#070b1a', '#0e1630', '#1b2a4e')]
Ocean = [Hex(c) for c in ('#173a73', '#1f5aa8', '#3b7dd8', '#7db8f2')]
Cloud = [Hex(c) for c in ('#c5d2e0', '#eef3f7', '#ffffff')]
Land = [Hex(c) for c in ('#1f4d2c', '#3a7a3a', '#6aa84f', '#c9a45c', '#8a6a3a')]
Dusk = [Hex('#6b4410')]
Lights = Hex('#ffcf6b')
Surface = Night + Ocean + Cloud + Land + Dusk
Palette = [(0, 0, 0)] + Surface + [Lights]
LightShare = 24
Sun = (0.82 / 1.0, 0.3, 0.49)
Glint = (1598, 832)
GlintRadius = 125
GlintOcean = (14, 62, 140)
Bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def Distance(a, b):
    return 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2


def Quantise(colour, x, y):
    ranked = sorted(Surface, key=lambda candidate: Distance(colour, candidate))
    first, second = ranked[0], ranked[1]
    axis = [second[i] - first[i] for i in range(3)]
    length = sum(v * v for v in axis) or 1
    along = sum((colour[i] - first[i]) * axis[i] for i in range(3)) / length
    share = min(0.5, max(0.0, (along - 0.22) / 0.28 * 0.5))
    threshold = (Bayer[y % 4][x % 4] + 0.5) / 16
    return second if threshold < share else first


def Despeckle(grid, size, keep):
    out = [row[:] for row in grid]
    for y in range(1, size - 1):
        for x in range(1, size - 1):
            here = grid[y][x]
            if here is None or here in keep:
                continue
            if any(grid[y + dy][x + dx] == here for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                continue
            around = [grid[y + dy][x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dx or dy]
            common = max(set(around), key=around.count)
            if common is not None and around.count(common) >= 6:
                out[y][x] = common
    return out


def Daylight(dx, dy, radius):
    u, v = dx / radius, -dy / radius
    depth = max(0.0, 1 - u * u - v * v) ** 0.5
    return u * Sun[0] + v * Sun[1] + depth * Sun[2]


def Render(still, lights, diameter):
    radius = diameter / 2
    pad = 3
    size = diameter + pad * 2
    box = (SourceCentre - SourceRadius, SourceCentre - SourceRadius, SourceCentre + SourceRadius, SourceCentre + SourceRadius)
    small = still.resize((diameter, diameter), Image.BOX, box=box).load()
    lit = lights.resize((diameter, diameter), Image.BOX, box=box).load()
    grid = [[None] * size for _ in range(size)]
    for y in range(size):
        for x in range(size):
            dx, dy = x - pad + 0.5 - radius, y - pad + 0.5 - radius
            distance = (dx * dx + dy * dy) ** 0.5
            day = Daylight(dx, dy, radius)
            threshold = Bayer[y % 4][x % 4]
            if distance < radius:
                colour = small[x - pad, y - pad]
                edge = radius - distance
                if edge < 1.6 and day > 0.02:
                    grid[y][x] = Ocean[3] if day > 0.12 or threshold < 8 else Night[2]
                elif edge < 4.6 and day > 0.12 and threshold < (8 if edge < 3.1 else 4):
                    grid[y][x] = Ocean[2]
                elif edge < 1.6:
                    grid[y][x] = Night[2] if threshold < 8 else Night[1]
                elif lit[x - pad, y - pad] > LightShare and sum(colour) < 150:
                    grid[y][x] = Lights
                else:
                    grid[y][x] = Quantise(colour, x, y)
            elif distance < radius + 1 and day > 0.12 and (x + y) % 2 == 0:
                grid[y][x] = Ocean[2]
    grid = Despeckle(grid, size, {Lights})
    index = {colour: at for at, colour in enumerate(Palette)}
    image = Image.new('P', (size, size), 0)
    flat = Palette + [(0, 0, 0)] * (256 - len(Palette))
    image.putpalette([channel for colour in flat for channel in colour])
    data = image.load()
    for y in range(size):
        for x in range(size):
            if grid[y][x] is not None:
                data[x, y] = index[grid[y][x]]
    return image


def RemoveGlint(still):
    pixels = still.load()
    for y in range(Glint[1] - GlintRadius, Glint[1] + GlintRadius):
        for x in range(Glint[0] - GlintRadius, Glint[0] + GlintRadius):
            reach = ((x - Glint[0]) ** 2 + (y - Glint[1]) ** 2) ** 0.5 / GlintRadius
            weight = min(1.0, max(0.0, (1 - reach) * 2.2))
            if weight > 0:
                pixels[x, y] = tuple(round(pixels[x, y][i] * (1 - weight) + GlintOcean[i] * weight) for i in range(3))


def Main():
    Target.mkdir(parents=True, exist_ok=True)
    still, lights = Prepare()
    for name, diameter in (('EarthLarge', 500), ('EarthMedium', 250), ('EarthSmall', 140)):
        image = Render(still, lights, diameter)
        image.save(Target / f'{name}.png', optimize=True, transparency=0)
        print(name, image.size)


def Prepare():
    still = Image.open(Source).convert('RGB')
    RemoveGlint(still)
    still = ImageEnhance.Color(still).enhance(1.5).point(lambda v: round(255 * (v / 255) ** 0.8))
    pixels = still.load()
    mask = Image.new('L', still.size, 0)
    target = mask.load()
    width, height = still.size
    for y in range(0, height):
        for x in range(0, width):
            r, g, b = pixels[x, y]
            if r > 110 and r > b * 1.6 and g > b * 1.15 and r + g + b < 520:
                target[x, y] = 255
    return still, mask


Main()
