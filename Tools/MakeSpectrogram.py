import json
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw

Raw = Path(sys.argv[1])
Out = Path(sys.argv[2])
Info = json.loads(Path(str(Raw).replace('.raw', '.json')).read_text())
Columns, Rows = Info['columns'], Info['rows']
Cells = Raw.read_bytes()
Stops = [(0, (7, 11, 26)), (70, (27, 42, 78)), (130, (59, 125, 216)), (185, (232, 168, 56)), (230, (255, 210, 122)), (255, (255, 255, 255))]


def Colour(value):
    for (low, a), (high, b) in zip(Stops, Stops[1:]):
        if value <= high:
            t = (value - low) / max(1, high - low)
            return tuple(round(x + (y - x) * t) for x, y in zip(a, b))
    return Stops[-1][1]


Palette = [Colour(v) for v in range(256)]
Picture = Image.new('RGB', (Columns, Rows))
Picture.putdata([Palette[v] for v in Cells])
Scale = 2
Margin = 48
Canvas = Image.new('RGB', (Columns + Margin + 10, Rows * Scale + 40), (0, 0, 0))
Canvas.paste(Picture.resize((Columns, Rows * Scale), Image.NEAREST), (Margin, 10))
Draw = ImageDraw.Draw(Canvas)
for Hz in [50, 150, 300, 1000, 4000, 10000]:
    Row = (math.log(Hz / Info['lowHz']) / math.log(Info['highHz'] / Info['lowHz'])) * (Rows - 1)
    Y = 10 + (Rows - 1 - Row) * Scale
    Draw.line([(Margin - 6, Y), (Margin - 1, Y)], fill=(200, 200, 200), width=1)
    if Hz in (300, 4000):
        Draw.line([(Margin, Y), (Margin + Columns, Y)], fill=(62, 207, 133), width=1)
    Draw.text((4, Y - 6), f'{Hz if Hz < 1000 else str(Hz // 1000) + "k"}', fill=(200, 200, 200))
Seconds = Info['seconds']
Step = 5 if Seconds > 20 else 1
for S in range(0, int(Seconds) + 1, Step):
    X = Margin + S / Seconds * Columns
    Draw.line([(X, 10 + Rows * Scale), (X, 16 + Rows * Scale)], fill=(200, 200, 200))
    Draw.text((X - 6, 18 + Rows * Scale), f'{S}s', fill=(200, 200, 200))
Canvas.save(Out)
print('wrote', Out)
