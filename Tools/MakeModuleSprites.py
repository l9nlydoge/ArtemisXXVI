import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

Width, Height = 32, 20
Root = Path(__file__).resolve().parent.parent
SheetPath = Root / 'public' / 'Art' / 'ModuleSprites.png'

Order = [
    'SolarArray', 'Battery', 'Camera', 'Spectrometer', 'Radar', 'ParticleDetector', 'HighEnergyDetector',
    'RadiationShielding', 'MagneticShield', 'FlightComputer', 'Thrusters', 'Antenna', 'RepairDrone', 'CrewCapsule',
]


def Hex(code):
    return tuple(int(code[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Palette:
    Black = Hex('#000000')
    Gold = [Hex('#6b4410'), Hex('#b9741c'), Hex('#e8a838'), Hex('#ffd27a')]
    Hull = [Hex('#161a22'), Hex('#2b313c'), Hex('#4a5362'), Hex('#7c8797'), Hex('#b8c1cc')]
    Cell = [Hex('#131a4d'), Hex('#27307e'), Hex('#4c57ba')]
    Ocean = [Hex('#173a73'), Hex('#1f5aa8'), Hex('#3b7dd8'), Hex('#7db8f2')]
    Cloud = [Hex('#c5d2e0'), Hex('#eef3f7'), Hex('#ffffff')]
    Danger = [Hex('#7a1f2b'), Hex('#c8323f'), Hex('#ff5263')]
    Good = [Hex('#1f7a4d'), Hex('#3ecf85')]
    Caution = Hex('#f2e05a')
    Aurora = [Hex('#6a3fb8'), Hex('#b06cf0')]

    @staticmethod
    def OutlineFor(colour):
        ramps = [Palette.Gold, Palette.Hull, Palette.Cell, Palette.Ocean, Palette.Danger, Palette.Good, Palette.Aurora]
        for ramp in ramps:
            if colour in ramp:
                return Palette.Black if colour == ramp[0] else ramp[0]
        if colour in Palette.Cloud:
            return Palette.Hull[2]
        if colour == Palette.Caution:
            return Palette.Gold[1]
        return Palette.Black


class Sprite:
    def __init__(self):
        self.Body = Image.new('RGBA', (Width, Height), (0, 0, 0, 0))
        self.Glow = Image.new('RGBA', (Width, Height), (0, 0, 0, 0))
        self.Draw = ImageDraw.Draw(self.Body)
        self.Effect = ImageDraw.Draw(self.Glow)

    def Rect(self, x0, y0, x1, y1, colour, effect=False):
        (self.Effect if effect else self.Draw).rectangle([x0, y0, x1, y1], fill=colour)

    def Dot(self, x, y, colour, effect=False):
        (self.Glow if effect else self.Body).putpixel((x, y), colour)

    def Line(self, points, colour, effect=False):
        (self.Effect if effect else self.Draw).line(points, fill=colour, width=1)

    def Poly(self, points, colour):
        self.Draw.polygon(points, fill=colour)

    def Disc(self, cx, cy, r, colour, effect=False):
        for y in range(Height):
            for x in range(Width):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6:
                    self.Dot(x, y, colour, effect)

    def Arc(self, cx, cy, r, start, end, colour, effect=True):
        seen = set()
        for step in range(400):
            angle = math.radians(start + (end - start) * step / 399)
            point = (round(cx + r * math.cos(angle)), round(cy + r * math.sin(angle)))
            if point not in seen and 0 <= point[0] < Width and 0 <= point[1] < Height:
                seen.add(point)
                self.Dot(point[0], point[1], colour, effect)

    def Finish(self):
        body = self.Body
        outlined = body.copy()
        for y in range(Height):
            for x in range(Width):
                if body.getpixel((x, y))[3]:
                    continue
                darkest = None
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < Width and 0 <= ny < Height and body.getpixel((nx, ny))[3]:
                        candidate = Palette.OutlineFor(body.getpixel((nx, ny)))
                        if darkest is None or sum(candidate[:3]) < sum(darkest[:3]):
                            darkest = candidate
                if darkest:
                    outlined.putpixel((x, y), darkest)
        result = Image.new('RGBA', (Width, Height), (0, 0, 0, 0))
        result.alpha_composite(self.Glow)
        result.alpha_composite(outlined)
        for y in range(Height):
            for x in range(Width):
                if self.Glow.getpixel((x, y))[3] and not body.getpixel((x, y))[3]:
                    result.putpixel((x, y), self.Glow.getpixel((x, y)))
        return result


def Shade(sprite, x0, y0, x1, y1, ramp, light=2):
    sprite.Rect(x0, y0, x1, y1, ramp[light - 1])
    sprite.Rect(x0, y0, x1 - 1, y1 - 1, ramp[light])
    sprite.Rect(x0, y0, x1 - 1, y0, ramp[light + 1] if light + 1 < len(ramp) else ramp[light])
    sprite.Rect(x0, y0, x0, y1 - 1, ramp[light + 1] if light + 1 < len(ramp) else ramp[light])


def SolarArray():
    s = Sprite()
    for left in (1, 21):
        s.Rect(left, 3, left + 9, 15, Palette.Hull[3])
        s.Rect(left + 9, 3, left + 9, 15, Palette.Hull[2])
        s.Rect(left, 15, left + 9, 15, Palette.Hull[2])
        for cx in range(3):
            for cy in range(3):
                x, y = left + 1 + cx * 3, 4 + cy * 4
                s.Rect(x, y, x + 1, y + 2, Palette.Cell[1])
                s.Dot(x, y, Palette.Cell[2])
    s.Rect(11, 8, 20, 9, Palette.Hull[3])
    s.Rect(11, 9, 20, 9, Palette.Hull[2])
    Shade(s, 13, 5, 18, 13, Palette.Gold)
    s.Rect(13, 9, 18, 9, Palette.Gold[1])
    result = s.Finish()
    result.putpixel((2, 4), Palette.Cloud[2])
    result.putpixel((22, 4), Palette.Cloud[2])
    return result


def Battery():
    s = Sprite()
    Shade(s, 3, 4, 26, 16, Palette.Gold)
    s.Rect(27, 8, 28, 12, Palette.Hull[3])
    s.Rect(27, 11, 28, 12, Palette.Hull[2])
    s.Rect(5, 6, 24, 14, Palette.Hull[0])
    for index in range(4):
        x = 6 + index * 5
        s.Rect(x, 7, x + 3, 13, Palette.Good[0])
        s.Rect(x, 7, x + 3, 7, Palette.Good[1])
        s.Rect(x, 7, x, 12, Palette.Good[1])
    s.Rect(6 + 15, 7, 6 + 18, 13, Palette.Hull[1])
    s.Rect(6, 1, 8, 1, Palette.Caution, effect=True)
    s.Rect(7, 0, 7, 2, Palette.Caution, effect=True)
    return s.Finish()


def Camera():
    s = Sprite()
    s.Rect(7, 2, 13, 4, Palette.Hull[3])
    s.Rect(7, 4, 13, 4, Palette.Hull[2])
    Shade(s, 3, 5, 28, 17, Palette.Gold)
    s.Rect(3, 9, 28, 9, Palette.Gold[1])
    s.Disc(16, 11, 6, Palette.Hull[2])
    s.Disc(15.5, 10.5, 5, Palette.Hull[3])
    s.Disc(16, 11, 4, Palette.Hull[1])
    s.Disc(16, 11, 3, Palette.Ocean[0])
    s.Disc(16, 11, 2, Palette.Ocean[1])
    s.Dot(15, 10, Palette.Ocean[3])
    s.Dot(14, 9, Palette.Cloud[2])
    s.Rect(24, 7, 25, 7, Palette.Danger[2])
    return s.Finish()


def Spectrometer():
    s = Sprite()
    s.Poly([(14, 2), (7, 16), (21, 16)], Palette.Cloud[0])
    s.Poly([(14, 4), (10, 13), (14, 13)], Palette.Cloud[1])
    s.Line([(14, 3), (14, 4)], Palette.Cloud[2])
    s.Rect(6, 17, 22, 18, Palette.Hull[3])
    s.Rect(6, 18, 22, 18, Palette.Hull[2])
    s.Line([(0, 12), (10, 10)], Palette.Cloud[2], effect=True)
    colours = [Palette.Danger[2], Palette.Gold[2], Palette.Caution, Palette.Good[1], Palette.Ocean[2], Palette.Aurora[1]]
    for index, colour in enumerate(colours):
        s.Line([(19, 9 + index // 2), (31, 4 + index * 2.6)], colour, effect=True)
    return s.Finish()


def Radar():
    s = Sprite()
    Shade(s, 1, 13, 6, 18, Palette.Gold)
    s.Rect(4, 9, 7, 11, Palette.Hull[2])
    for y in range(Height):
        for x in range(Width):
            if ((x - 10) / 4.2) ** 2 + ((y - 9.5) / 9.2) ** 2 <= 1:
                s.Dot(x, y, Palette.Hull[2])
    for y in range(Height):
        for x in range(Width):
            if ((x - 11.5) / 3.2) ** 2 + ((y - 9.5) / 8.2) ** 2 <= 1:
                s.Dot(x, y, Palette.Hull[4] if y < 8 else Palette.Hull[3])
    s.Rect(12, 9, 18, 9, Palette.Hull[1])
    s.Rect(18, 8, 19, 11, Palette.Hull[4])
    s.Rect(19, 10, 19, 11, Palette.Hull[2])
    for radius in (5, 8, 11):
        s.Arc(19, 9.5, radius, -38, 38, Palette.Good[1])
    return s.Finish()


def ParticleDetector():
    s = Sprite()
    Shade(s, 12, 1, 29, 18, Palette.Gold)
    s.Rect(14, 3, 27, 16, Palette.Hull[0])
    s.Rect(14, 3, 27, 3, Palette.Gold[0])
    s.Rect(14, 3, 14, 16, Palette.Gold[0])
    for x in range(16, 27, 3):
        for y in range(5, 16, 3):
            s.Dot(x, y, Palette.Hull[1])
    tracks = [((0, 2), (13, 6)), ((0, 11), (13, 10)), ((1, 19), (13, 14))]
    for start, end in tracks:
        steps = max(abs(end[0] - start[0]), abs(end[1] - start[1]))
        for step in range(steps + 1):
            if step % 3 == 2:
                continue
            x = round(start[0] + (end[0] - start[0]) * step / steps)
            y = round(start[1] + (end[1] - start[1]) * step / steps)
            s.Dot(x, y, Palette.Danger[2], effect=True)
    for points in ([(15, 6), (19, 7), (22, 6)], [(15, 10), (20, 10), (24, 12)], [(15, 14), (18, 13), (21, 14)]):
        s.Line(points, Palette.Danger[2])
    result = s.Finish()
    for x, y in ((22, 6), (24, 12), (21, 14)):
        result.putpixel((x, y), Palette.Caution)
    return result

def HighEnergyDetector():
    s = Sprite()
    Shade(s, 6, 9, 24, 18, Palette.Gold)
    s.Rect(5, 6, 25, 8, Palette.Hull[2])
    for x in range(6, 25):
        for y in (6, 7):
            if (x + y) % 2 == 0:
                s.Dot(x, y, Palette.Hull[4] if y == 6 else Palette.Hull[3])
            else:
                s.Dot(x, y, Palette.Hull[0])
    s.Rect(5, 3, 5, 8, Palette.Hull[3])
    s.Rect(25, 3, 25, 8, Palette.Hull[2])
    s.Rect(9, 12, 21, 15, Palette.Hull[0])
    for x in range(10, 21, 2):
        s.Dot(x, 13, Palette.Aurora[0])
    bolt = [(30, 0), (27, 3), (29, 4), (25, 8)]
    for a, b in zip(bolt, bolt[1:]):
        s.Line([a, b], Palette.Aurora[1], effect=True)
    s.Dot(26, 7, Palette.Cloud[2], effect=True)
    return s.Finish()


def RadiationShielding():
    s = Sprite()
    outline = [(9, 1), (22, 1), (22, 11), (16, 18), (15, 18), (9, 11)]
    s.Poly(outline, Palette.Gold[1])
    s.Poly([(10, 2), (21, 2), (21, 11), (16, 17), (15, 17), (10, 11)], Palette.Hull[3])
    s.Poly([(10, 2), (15, 2), (15, 17), (10, 11)], Palette.Hull[4])
    for y in (6, 10):
        s.Line([(10, y), (21, y)], Palette.Hull[2])
    s.Line([(9, 1), (22, 1)], Palette.Gold[2])
    s.Line([(9, 1), (9, 11)], Palette.Gold[2])
    for y0, y1 in ((4, 3), (9, 9), (14, 15)):
        s.Line([(31, y0), (25, y1)], Palette.Danger[2], effect=True)
    result = s.Finish()
    for x, y in ((24, 2), (24, 4), (24, 8), (24, 10), (23, 14), (24, 16)):
        result.putpixel((x, y), Palette.Caution)
    return result


def MagneticShield():
    s = Sprite()
    for y in range(Height):
        for x in range(Width):
            dx, dy = x - 15.5, y - 9
            distance = math.hypot(dx, dy)
            if y <= 9 and 3.6 <= distance <= 7.6:
                s.Dot(x, y, Palette.Danger[2] if dx < 0 and dy < -1 else Palette.Danger[1])
    s.Rect(8, 9, 11, 13, Palette.Danger[1])
    s.Rect(8, 9, 9, 13, Palette.Danger[2])
    s.Rect(20, 9, 23, 13, Palette.Danger[1])
    s.Rect(20, 9, 20, 13, Palette.Danger[2])
    s.Rect(8, 14, 11, 17, Palette.Hull[4])
    s.Rect(10, 14, 11, 17, Palette.Hull[3])
    s.Rect(20, 14, 23, 17, Palette.Hull[4])
    s.Rect(22, 14, 23, 17, Palette.Hull[3])
    for radius in (9, 12):
        s.Arc(15.5, 15.5, radius, 140, 220, Palette.Ocean[3])
        s.Arc(15.5, 15.5, radius, -40, 40, Palette.Ocean[3])
    return s.Finish()


def FlightComputer():
    s = Sprite()
    for x in range(11, 21, 2):
        s.Rect(x, 1, x, 2, Palette.Gold[2])
        s.Rect(x, 17, x, 18, Palette.Gold[1])
    for y in range(5, 15, 2):
        s.Rect(7, y, 8, y, Palette.Gold[2])
        s.Rect(23, y, 24, y, Palette.Gold[1])
    Shade(s, 9, 3, 22, 16, Palette.Hull, light=2)
    s.Rect(12, 6, 19, 13, Palette.Hull[0])
    s.Rect(13, 7, 18, 12, Palette.Gold[1])
    s.Rect(13, 7, 17, 11, Palette.Gold[2])
    s.Rect(13, 7, 17, 7, Palette.Gold[3])
    s.Dot(10, 4, Palette.Good[1])
    return s.Finish()


def Thrusters():
    s = Sprite()
    Shade(s, 1, 5, 8, 14, Palette.Gold)
    s.Rect(9, 8, 10, 11, Palette.Hull[2])
    for x in range(11, 19):
        half = 2 + (x - 11) * 0.62
        top, bottom = round(9.5 - half), round(9.5 + half)
        s.Rect(x, top, x, bottom, Palette.Hull[3])
        s.Dot(x, top, Palette.Hull[4])
        s.Rect(x, bottom - 1, x, bottom, Palette.Hull[2])
    flame = [(19, 3), (31, 9), (31, 10), (19, 16)]
    s.Effect.polygon(flame, fill=Palette.Gold[2])
    s.Effect.polygon([(19, 6), (28, 9), (28, 10), (19, 13)], fill=Palette.Caution)
    s.Effect.polygon([(19, 8), (24, 9), (24, 10), (19, 11)], fill=Palette.Cloud[2])
    return s.Finish()


def Antenna():
    s = Sprite()
    Shade(s, 11, 15, 20, 18, Palette.Gold)
    s.Rect(15, 6, 16, 14, Palette.Hull[3])
    s.Rect(16, 6, 16, 14, Palette.Hull[2])
    for y, half in ((9, 3), (12, 4)):
        s.Rect(15 - half, y, 16 + half, y, Palette.Hull[3])
    s.Rect(14, 3, 17, 5, Palette.Hull[4])
    s.Rect(16, 4, 17, 5, Palette.Hull[3])
    for radius in (5, 8, 11):
        s.Arc(15.5, 5, radius, -40, 25, Palette.Ocean[3])
        s.Arc(15.5, 5, radius, 155, 220, Palette.Ocean[3])
    return s.Finish()


def RepairDrone():
    s = Sprite()
    Shade(s, 2, 5, 13, 15, Palette.Gold)
    s.Rect(4, 8, 7, 11, Palette.Hull[0])
    s.Rect(5, 9, 6, 10, Palette.Good[1])
    s.Rect(1, 7, 1, 13, Palette.Hull[3])
    s.Rect(5, 3, 10, 4, Palette.Hull[3])
    s.Line([(14, 10), (19, 10)], Palette.Hull[3])
    s.Line([(14, 11), (19, 11)], Palette.Hull[2])
    s.Rect(19, 9, 21, 12, Palette.Hull[4])
    s.Line([(21, 9), (25, 5)], Palette.Hull[3])
    s.Line([(22, 9), (26, 5)], Palette.Hull[2])
    s.Rect(25, 3, 27, 5, Palette.Hull[4])
    s.Line([(27, 3), (30, 2)], Palette.Hull[3])
    s.Line([(27, 5), (30, 7)], Palette.Hull[3])
    result = s.Finish()
    for x, y in ((31, 4), (29, 4)):
        result.putpixel((x, y), Palette.Caution)
    return result


def CrewCapsule():
    s = Sprite()
    s.Poly([(13, 2), (18, 2), (25, 15), (6, 15)], Palette.Hull[3])
    s.Poly([(13, 2), (15, 2), (15, 15), (6, 15)], Palette.Hull[4])
    s.Rect(13, 0, 18, 1, Palette.Hull[2])
    s.Rect(14, 0, 17, 0, Palette.Hull[3])
    s.Rect(5, 16, 26, 17, Palette.Gold[1])
    s.Rect(5, 16, 26, 16, Palette.Gold[2])
    s.Rect(7, 18, 24, 18, Palette.Gold[0])
    s.Rect(11, 7, 13, 9, Palette.Hull[2])
    s.Rect(12, 8, 13, 9, Palette.Ocean[1])
    s.Dot(12, 8, Palette.Ocean[3])
    s.Rect(19, 9, 20, 13, Palette.Hull[2])
    s.Rect(6, 14, 25, 14, Palette.Hull[2])
    s.Dot(17, 4, Palette.Danger[2])
    return s.Finish()


Makers = {name: globals()[name] for name in Order}


def Build():
    sheet = Image.new('RGBA', (Width * len(Order), Height), (0, 0, 0, 0))
    for index, name in enumerate(Order):
        sheet.alpha_composite(Makers[name](), (index * Width, 0))
    return sheet


def Preview(sheet, path, scale=8):
    columns = 4
    rows = math.ceil(len(Order) / columns)
    cell = (Width * scale + 16, Height * scale + 16)
    preview = Image.new('RGB', (cell[0] * columns * 2, cell[1] * rows), (40, 40, 40))
    for index in range(len(Order)):
        sprite = sheet.crop((index * Width, 0, (index + 1) * Width, Height)).resize((Width * scale, Height * scale), Image.NEAREST)
        for side, background in enumerate(((0, 0, 0), (10, 12, 16))):
            x = (index % columns + side * columns) * cell[0] + 8
            y = (index // columns) * cell[1] + 8
            tile = Image.new('RGB', (Width * scale, Height * scale), background)
            tile.paste(sprite, (0, 0), sprite)
            preview.paste(tile, (x, y))
    preview.save(path)


if __name__ == '__main__':
    built = Build()
    SheetPath.parent.mkdir(parents=True, exist_ok=True)
    built.save(SheetPath, optimize=True)
    if len(sys.argv) > 1:
        Preview(built, sys.argv[1])
    print('Wrote', SheetPath)
