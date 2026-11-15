import random
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

Root = Path(__file__).resolve().parent.parent
SourceFolder = Root / 'Art' / 'Source' / 'Events'
OutputFolder = Root / 'public' / 'Images' / 'Events'
ArtWidth, ArtHeight = 128, 72
Bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def Hex(code):
    return tuple(int(code[i:i + 2], 16) for i in (1, 3, 5))


Black = Hex('#000000')
Stars = [Hex('#ffffff'), Hex('#c5d2e0'), Hex('#7db8f2'), Hex('#eef3f7')]


def Threshold(x, y):
    return (Bayer[y % 4][x % 4] + 0.5) / 16 - 0.5


class Picture:
    def __init__(self, name, box, adjust=None):
        source = Image.open(SourceFolder / f'{name}.jpg').convert('RGB')
        left, top, right, bottom = box
        canvas = Image.new('RGB', (right - left, bottom - top), Black)
        canvas.paste(source, (-left, -top))
        if adjust:
            canvas = adjust(canvas)
        self.Name = name
        self.Small = canvas.resize((ArtWidth, ArtHeight), Image.LANCZOS)
        self.Art = Image.new('RGB', (ArtWidth, ArtHeight), Black)
        self.Index = [[0] * ArtWidth for _ in range(ArtHeight)]

    def Ramp(self, ramp, spread=1.0, floor=0.0, gamma=1.0, channel=None):
        colours = [Hex(code) for code in ramp]
        for y in range(ArtHeight):
            for x in range(ArtWidth):
                r, g, b = self.Small.getpixel((x, y))
                value = (0.3 * r + 0.55 * g + 0.15 * b) / 255 if channel is None else channel(r, g, b)
                value = max(0.0, (value - floor) / (1 - floor)) ** gamma
                position = value * (len(colours) - 1) + Threshold(x, y) * spread
                index = max(0, min(len(colours) - 1, round(position)))
                self.Index[y][x] = index
                self.Art.putpixel((x, y), colours[index])
        self.Colours = colours
        return self

    def Nearest(self, palette, spread=24, floor=18):
        colours = [Hex(code) for code in palette]
        for y in range(ArtHeight):
            for x in range(ArtWidth):
                r, g, b = self.Small.getpixel((x, y))
                if max(r, g, b) < floor:
                    self.Art.putpixel((x, y), Black)
                    continue
                bias = Threshold(x, y) * spread
                r, g, b = r + bias, g + bias, b + bias
                best = min(colours, key=lambda c: 2 * (c[0] - r) ** 2 + 4 * (c[1] - g) ** 2 + 3 * (c[2] - b) ** 2)
                self.Art.putpixel((x, y), best)
        return self

    def Clean(self, keep=2):
        source = self.Art.copy()
        for y in range(ArtHeight):
            for x in range(ArtWidth):
                if source.getpixel((x, y)) == Black:
                    continue
                neighbours = sum(
                    1
                    for dx in (-1, 0, 1)
                    for dy in (-1, 0, 1)
                    if (dx or dy) and 0 <= x + dx < ArtWidth and 0 <= y + dy < ArtHeight and source.getpixel((x + dx, y + dy)) != Black
                )
                if neighbours < keep:
                    self.Art.putpixel((x, y), Black)
        return self

    def Outline(self, darker):
        source = self.Art.copy()
        table = {Hex(a): Hex(b) for a, b in darker.items()}
        for y in range(ArtHeight):
            for x in range(ArtWidth):
                colour = source.getpixel((x, y))
                if colour == Black:
                    continue
                edge = any(
                    not (0 <= x + dx < ArtWidth and 0 <= y + dy < ArtHeight) or source.getpixel((x + dx, y + dy)) == Black
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                )
                if edge and colour in table:
                    self.Art.putpixel((x, y), table[colour])
        return self

    def Starfield(self, count, seed):
        generator = random.Random(seed)
        placed = 0
        for _ in range(count * 40):
            if placed >= count:
                break
            x, y = generator.randrange(1, ArtWidth - 1), generator.randrange(1, ArtHeight - 1)
            clear = all(
                self.Art.getpixel((x + dx, y + dy)) == Black
                for dx in range(-3, 4)
                for dy in range(-3, 4)
                if 0 <= x + dx < ArtWidth and 0 <= y + dy < ArtHeight
            )
            if clear:
                self.Art.putpixel((x, y), Stars[placed % len(Stars)])
                placed += 1
        return self

    def Night(self, band, ground):
        band = {Hex(code) for code in band}
        limb = [max([y for y in range(ArtHeight) if self.Art.getpixel((x, y)) in band], default=None) for x in range(ArtWidth)]
        known = [x for x in range(ArtWidth) if limb[x] is not None]
        for x in range(ArtWidth):
            nearest = min(known, key=lambda k: abs(k - x))
            edge = limb[nearest] + (abs(nearest - x) // 6 if nearest != x else 0)
            for y in range(edge + 1, ArtHeight):
                if self.Art.getpixel((x, y)) == Black:
                    self.Art.putpixel((x, y), Hex(ground))
        return self

    def Place(self, box, x, y):
        return round((x - box[0]) / (box[2] - box[0]) * ArtWidth), round((y - box[1]) / (box[3] - box[1]) * ArtHeight)

    def Paint(self, points, colour):
        for x, y in points:
            if 0 <= x < ArtWidth and 0 <= y < ArtHeight:
                self.Art.putpixel((x, y), Hex(colour))
        return self

    def Save(self):
        self.Art.save(OutputFolder / f'{self.Name}.png', optimize=True)
        return self.Art


def Contrast(amount, brightness=1.0, colour=1.0):
    def apply(image):
        image = ImageEnhance.Brightness(image).enhance(brightness)
        image = ImageEnhance.Contrast(image).enhance(amount)
        return ImageEnhance.Color(image).enhance(colour)
    return apply


Rock = ['#000000', '#161a22', '#2b313c', '#4a5362', '#7c8797', '#b8c1cc', '#eef3f7']
RockEdge = {'#eef3f7': '#b8c1cc', '#b8c1cc': '#7c8797', '#7c8797': '#4a5362', '#4a5362': '#2b313c', '#2b313c': '#161a22'}


def AsteroidA():
    box = (130, 170, 1090, 710)
    picture = Picture('AsteroidA', box, Contrast(1.2))
    picture.Ramp(Rock, spread=0.55, floor=0.06, gamma=0.9).Clean().Outline(RockEdge)
    x, y = picture.Place(box, 1011, 509)
    for dx in range(-3, 4):
        for dy in range(-3, 4):
            picture.Art.putpixel((x + dx, y + dy), Black)
    picture.Paint([(x, y), (x + 1, y), (x, y + 1)], '#7c8797').Paint([(x, y)], '#b8c1cc').Paint([(x + 1, y + 1)], '#4a5362')
    return picture.Starfield(9, 1).Save()


def AsteroidB():
    picture = Picture('AsteroidB', (-382, 65, 1662, 1215), Contrast(1.25, 1.05))
    picture.Ramp(Rock, spread=0.55, floor=0.05, gamma=0.95).Clean().Outline(RockEdge)
    return picture.Starfield(10, 2).Save()


def AsteroidC():
    picture = Picture('AsteroidC', (0, 12, 372, 221), Contrast(1.4, 1.0))
    picture.Ramp(Rock, spread=0.55, floor=0.04, gamma=1.0).Clean(1)
    return picture.Starfield(4, 3).Save()


def AuroraProfile(columns):
    source = Image.open(SourceFolder / 'Storm.jpg').convert('RGB')
    width, height = source.size
    strength = []
    for column in range(columns):
        total = 0
        for x in range(column * width // columns, (column + 1) * width // columns, 4):
            limb = 430 - 50 * x / width
            for y in range(150, int(limb), 4):
                r, g, b = source.getpixel((x, y))
                total += max(0, r - g) + max(0, b - g) + max(0, g - r) // 2
        strength.append(total)
    smooth = [sum(strength[max(0, i - 3):i + 4]) / len(strength[max(0, i - 3):i + 4]) for i in range(columns)]
    top = max(smooth)
    return [value / top for value in smooth]


def Storm():
    picture = Picture('Storm', (0, 0, 1280, 853))
    art = picture.Art
    art.paste(Black, (0, 0, ArtWidth, ArtHeight))
    generator = random.Random(26)
    centre, radius, crest = 80, 260, 46

    def LimbAt(x):
        return crest + radius - (radius ** 2 - (x - centre) ** 2) ** 0.5

    def Noise(x, y):
        value = 0.0
        for scale, weight in ((9, 0.6), (4, 0.3), (2, 0.1)):
            gx, gy = x / scale, y / scale * 2.4
            ix, iy = int(gx), int(gy)
            fx, fy = gx - ix, gy - iy
            corner = lambda cx, cy: random.Random(cx * 7919 + cy * 104729 + scale).random()
            top = corner(ix, iy) * (1 - fx) + corner(ix + 1, iy) * fx
            bottom = corner(ix, iy + 1) * (1 - fx) + corner(ix + 1, iy + 1) * fx
            value += weight * (top * (1 - fy) + bottom * fy)
        return value

    for x in range(ArtWidth):
        limb = round(LimbAt(x))
        for y in range(limb + 1, ArtHeight):
            depth = y - limb
            cloud = Noise(x, y) + (0.12 if depth < 6 else 0)
            colour = '#070b1a'
            if cloud + Threshold(x, y) * 0.16 > 0.62:
                colour = '#0e1630'
            if depth == 1 and cloud > 0.5:
                colour = '#173a73'
            art.putpixel((x, y), Hex(colour))
        art.putpixel((x, limb), Hex('#1b2a4e'))
        art.putpixel((x, limb - 1), Hex('#1f7a4d'))

    for _ in range(7):
        cx, cy = generator.randrange(6, ArtWidth - 6), 0
        cy = round(LimbAt(cx)) + generator.randrange(6, ArtHeight - round(LimbAt(cx)) - 2) if ArtHeight - round(LimbAt(cx)) > 9 else None
        if cy is None:
            continue
        for _ in range(generator.randrange(1, 4)):
            x, y = cx + generator.randrange(-2, 3), cy + generator.randrange(-1, 2)
            if y > LimbAt(x) + 4:
                art.putpixel((x, y), Hex('#ffcf6b'))

    profile = AuroraProfile(ArtWidth)
    ramp = ['#3ecf85', '#3ecf85', '#3ecf85', '#1f7a4d', '#6a3fb8', '#b06cf0', '#b06cf0', '#6a3fb8', '#7a1f2b']
    rays = [generator.uniform(0.2, 0.4) for _ in range(ArtWidth)]
    x = 0
    while x < ArtWidth:
        width = generator.choice((1, 1, 2, 2, 3))
        lift = generator.uniform(0.55, 1.0) if generator.random() < 0.5 else generator.uniform(0.3, 0.6)
        for column in range(x, min(ArtWidth, x + width)):
            rays[column] = lift
        x += width + generator.choice((0, 1, 1, 2))
    for x in range(ArtWidth):
        strength = profile[x] ** 0.8
        if strength < 0.1:
            continue
        glow = round(1 + 2 * strength)
        height = round(glow + (5 + 26 * strength) * rays[x])
        base = round(LimbAt(x)) - 2
        for step in range(height):
            y = base - step
            if y < 0:
                break
            share = step / max(1, height - 1)
            position = share * (len(ramp) - 1) + Threshold(x, y) * 0.7
            colour = ramp[max(0, min(len(ramp) - 1, round(position)))]
            if step < glow:
                colour = '#3ecf85' if step < glow - 1 or strength > 0.5 else '#1f7a4d'
            elif (share - 0.55) / 0.45 > 0.5 - Threshold(x, y) * 1.9:
                continue
            art.putpixel((x, y), Hex(colour))
    return picture.Starfield(14, 4).Save()


def StormSevere():
    picture = Picture('StormSevere', (0, 236, 1280, 956), Contrast(1.15))
    picture.Ramp(['#000000', '#24120a', '#47240c', '#6b4410', '#b9741c', '#e8a838', '#ffd27a', '#ffffff'], floor=0.03, gamma=1.05)
    return picture.Starfield(3, 5).Save()


def Grb221009A():
    picture = Picture('Grb221009A', (-178, 135, 1262, 945), Contrast(1.2, 1.25))
    picture.Ramp(['#000000', '#3a0e0c', '#7a1f2b', '#c8323f', '#d2502a', '#e8a838', '#ffd27a', '#ffffff'], floor=0.16, gamma=0.8, channel=lambda r, g, b: (0.7 * r + 0.3 * g) / 255)
    return picture.Starfield(0, 6).Save()


def ExoplanetVisible():
    box = (0, 238, 800, 688)
    picture = Picture('ExoplanetVisible', box, Contrast(1.2))
    picture.Ramp(['#000000', '#1c0606', '#3a0e0c', '#7a1f2b', '#a8301e', '#d2502a', '#e8a838', '#ffd27a'], floor=0.04, gamma=1.1, channel=lambda r, g, b: (0.6 * r + 0.4 * g) / 255)
    for x, y in ((521, 649), (565, 662), (750, 786), (874, 825)):
        picture.Paint([picture.Place(box, x, y)], '#000000')
    for x, y, size in ((58, 39, 2), (71, 40, 1), (86, 41, 2), (103, 42, 1), (117, 43, 2)):
        picture.Paint([(x + dx, y + dy) for dx in range(size) for dy in range(size)], '#000000')
        if x > 80:
            picture.Paint([(x - 1, y + dy) for dy in range(size)], '#a8301e')
    return picture.Save()


def ExoplanetSpectrum():
    picture = Picture('ExoplanetSpectrum', (0, 0, 1280, 720), Contrast(1.15, 1.0, 1.1))
    picture.Nearest(['#000000', '#070b1a', '#0e1630', '#173a73', '#1f5aa8', '#3b7dd8', '#7db8f2', '#8a6a3a', '#b89a6a', '#e6d3a8', '#c9a45c', '#c5d2e0', '#eef3f7', '#4a5362', '#7c8797'], spread=26, floor=16)
    return picture.Starfield(8, 7).Save()


def DartImpact():
    picture = Picture('DartImpact', (0, 0, 1280, 720), Contrast(1.25, 1.05, 1.15))
    picture.Nearest(['#000000', '#161a22', '#2b313c', '#4a5362', '#7c8797', '#b8c1cc', '#eef3f7', '#ffffff', '#6b4410', '#b9741c', '#e8a838', '#ffd27a', '#131a4d', '#27307e', '#4c57ba', '#1f5aa8', '#7db8f2'], spread=28, floor=24)
    return picture.Starfield(10, 8).Save()


Makers = [AsteroidA, AsteroidB, AsteroidC, Storm, StormSevere, ExoplanetVisible, ExoplanetSpectrum, DartImpact, Grb221009A]


def ContactSheet(arts, path, scale=4):
    gutter = 12
    columns = 3
    rows = (len(arts) + columns - 1) // columns
    sheet = Image.new('RGB', (columns * (ArtWidth * scale + gutter) + gutter, rows * (ArtHeight * scale + gutter) + gutter), (10, 12, 16))
    for index, art in enumerate(arts):
        x = gutter + (index % columns) * (ArtWidth * scale + gutter)
        y = gutter + (index // columns) * (ArtHeight * scale + gutter)
        sheet.paste(art.resize((ArtWidth * scale, ArtHeight * scale), Image.NEAREST), (x, y))
    sheet.save(path)


if __name__ == '__main__':
    OutputFolder.mkdir(parents=True, exist_ok=True)
    only = sys.argv[2] if len(sys.argv) > 2 else None
    arts = [maker() for maker in Makers if not only or maker.__name__ == only]
    if len(sys.argv) > 1:
        ContactSheet(arts, sys.argv[1], 4 if not only else 8)
    print('Wrote', len(arts), 'pictures to', OutputFolder)
