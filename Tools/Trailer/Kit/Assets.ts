import { GameData } from '../../../src/Data/GameData'
import { ModuleCatalog } from '../../../src/Engine/Modules/ModuleCatalog'
import { BusCatalog } from '../../../src/Engine/Spacecraft/BusCatalog'
import { InstalledModule } from '../../../src/Engine/Spacecraft/InstalledModule'
import { Loadout } from '../../../src/Engine/Spacecraft/Loadout'
import Strings from '../../../src/I18n/StringsEn.json'
import { EarthMap } from '../../../src/Interface/Backdrop/GlobeRenderer'
import { SourceFigures } from '../../../src/Interface/Screens/SourceFigures'
import { SpriteImage } from '../../../src/Interface/Scene/SpriteImage'
import { SpacecraftBlueprint } from '../../../src/Interface/Spacecraft/SpacecraftBlueprint'
import { SpacecraftPainter } from '../../../src/Interface/Spacecraft/SpacecraftPainter'

export const SpriteOrder = ['SolarArray', 'Battery', 'Camera', 'Spectrometer', 'Radar', 'ParticleDetector', 'HighEnergyDetector', 'RadiationShielding', 'MagneticShield', 'FlightComputer', 'Thrusters', 'Antenna', 'RepairDrone', 'CrewCapsule']
export const Fit = ['SolarArray', 'Battery', 'Camera', 'Spectrometer', 'ParticleDetector', 'MagneticShield']

export class Assets {
  static earth: EarthMap
  static earthSmall: EarthMap
  static modules = new Map<string, HTMLCanvasElement>()
  static craft: SpriteImage[] = []
  static craftShielded: SpriteImage[] = []
  static craftSteps: SpriteImage[][] = []
  static craftScale = 6
  static events = new Map<string, HTMLImageElement>()
  static figures: Record<string, number>
  static wording: Record<string, string> = Strings as Record<string, string>
  static rock = { name: '', missKm: 0, date: '' }

  static async load() {
    ;[Assets.earth, Assets.earthSmall] = await Promise.all([EarthMap.load(`/Backdrop/EarthMapLarge.png`), EarthMap.load(`/Backdrop/EarthMapMedium.png`)])
    const sheet = await Assets.image('/Art/ModuleSprites.png')
    for (const name of ['AsteroidA', 'Storm', 'StormSevere', 'DartImpact']) Assets.events.set(name, await Assets.image(`/Images/Events/${name}.png`))
    SpriteOrder.forEach((id, index) => {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 20
      canvas.getContext('2d')!.drawImage(sheet, index * 32, 0, 32, 20, 0, 0, 32, 20)
      Assets.modules.set(id, canvas)
    })
    const catalog = ModuleCatalog.shared
    const loadout = new Loadout(BusCatalog.shared.get('Explorer'), Fit.map((id) => new InstalledModule(catalog.get(id), 2, 1)))
    const painter = new SpacecraftPainter(new SpacecraftBlueprint(loadout))
    const shield = new Set(loadout.installed.filter((module) => module.card.id === 'MagneticShield').map((module) => module.key))
    const plain = [painter.paint(0, new Set()), painter.paint(1, new Set())]
    const lit = [painter.paint(0, shield), painter.paint(1, shield)]
    const crop = SpacecraftPainter.crop([...plain, ...lit])
    Assets.craft = plain.map((pixels) => SpriteImage.fromPixels(pixels, crop))
    Assets.craftScale = Math.max(2, Math.floor(480 / Math.max(crop.w, crop.h)))
    Assets.craftShielded = lit.map((pixels) => SpriteImage.fromPixels(pixels, crop))
    Assets.craftSteps = Fit.map((_, count) => {
      const partial = new SpacecraftPainter(new SpacecraftBlueprint(new Loadout(BusCatalog.shared.get('Explorer'), Fit.slice(0, count + 1).map((id) => new InstalledModule(catalog.get(id), 2, 1)))))
      const frames = [partial.paint(0, new Set()), partial.paint(1, new Set())]
      const box = SpacecraftPainter.crop(frames)
      return frames.map((pixels) => SpriteImage.fromPixels(pixels, box))
    })
    Assets.figures = new SourceFigures(GameData.weeks.all).params
    const record = GameData.asteroids.find((entry) => entry.name === '2019 OK')!
    Assets.rock = { name: record.name, missKm: record.missKm, date: record.dateUtc }
  }

  static word(key: string): string {
    return Assets.wording[key] ?? key
  }

  private static image(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = url
    })
  }
}
