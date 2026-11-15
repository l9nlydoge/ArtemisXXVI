import { Assets } from './Kit/Assets'
import { FontFamily } from './Kit/Film'
import { Join, Timeline } from './Kit/Timeline'
import { DebriefShot } from './Shots/DebriefShot'
import { EndShot } from './Shots/EndShot'
import { FlightShot } from './Shots/FlightShot'
import { HangarShot } from './Shots/HangarShot'
import { HookShot } from './Shots/HookShot'
import { LaunchShot } from './Shots/LaunchShot'
import { RecordsShot } from './Shots/RecordsShot'
import { StormShot } from './Shots/StormShot'
import { Score } from './Sound/Score'

export const Cuts = [0, 4.8, 9.6, 13.2, 16.8, 19.2, 24.0, 26.4, 30.0]

class Trailer {
  private timeline?: Timeline
  private readonly context: CanvasRenderingContext2D

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!
  }

  async ready() {
    await document.fonts.load(`120px ${FontFamily}`)
    await document.fonts.ready
    await Assets.load()
    const at = (index: number) => [Cuts[index], Cuts[index + 1]] as const
    this.timeline = new Timeline(
      [new HookShot(...at(0)), new HangarShot(...at(1)), new LaunchShot(...at(2)), new FlightShot(...at(3)), new RecordsShot(...at(4)), new StormShot(...at(5)), new DebriefShot(...at(6)), new EndShot(...at(7))],
      [Join.Wipe, Join.Cut, Join.Cut, Join.Wipe, Join.Cut, Join.Wipe, Join.Cut],
      Cuts[Cuts.length - 1],
    )
    return { stormIds: Assets.stormCount, donki: Assets.donkiStorms, figures: Assets.figures, rock: Assets.rock, craft: [Assets.craft[0].width, Assets.craft[0].height] }
  }

  render(time: number): Promise<void> {
    this.context.imageSmoothingEnabled = false
    this.timeline!.render(this.context, time)
    return new Promise((resolve) => requestAnimationFrame(() => resolve()))
  }

  frame(time: number, quality = 0.95): string {
    this.timeline!.render(this.context, time)
    return this.canvas.toDataURL('image/jpeg', quality).slice(23)
  }

  sound(): Promise<{ wav: string; peak: number; levels: number[] }> {
    return new Score(Cuts[Cuts.length - 1]).render()
  }
}

declare global {
  interface Window {
    Trailer: Trailer
  }
}

window.Trailer = new Trailer(document.getElementById('Film') as HTMLCanvasElement)
