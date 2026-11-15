import { test } from 'vitest'
import { GameData } from '../../src/Data/GameData'
import { CautiousBot } from '../../src/Engine/Bots/CautiousBot'
import { GreedyBot } from '../../src/Engine/Bots/GreedyBot'
import { PlannerBot } from '../../src/Engine/Bots/PlannerBot'
import { PurchaseStudy } from '../../src/Engine/Bots/PurchaseStudy'
import type { MarkSpec } from '../../src/Engine/Modules/MarkSpec'
import { ModuleCatalog } from '../../src/Engine/Modules/ModuleCatalog'
import { Profile } from '../../src/Engine/Progress/Profile'

const flySeeds = Array.from({ length: Number(process.env.FLY ?? 60) }, (_, index) => 5000 + index)
const pct = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(0)}%`

function profileWith(lifetime: number, owned: Record<string, number>): Profile {
  const starter = Profile.starter().toJson()
  return Profile.fromJson({ ...starter, points: 2000, lifetimePoints: lifetime, ownedMarks: { ...starter.ownedMarks, ...owned } })
}

interface Variant {
  name: string
  moduleId: string
  profile: () => Profile
  change: () => () => void
}

function setMark(id: string, mark: number, patch: Partial<MarkSpec>): () => void {
  const spec = ModuleCatalog.shared.get(id).mark(mark as 1 | 2 | 3) as MarkSpec
  const before = { ...spec }
  Object.assign(spec, patch)
  return () => Object.assign(spec, before)
}

function setPower(id: string, power: number): () => void {
  const card = ModuleCatalog.shared.get(id) as unknown as { powerCost: number }
  const before = card.powerCost
  card.powerCost = power
  return () => (card.powerCost = before)
}

const afterOne = () => profileWith(230, {})
const afterTwo = () => profileWith(412, { Radar: 1, MagneticShield: 1 })
const none = () => () => undefined

const variants: Variant[] = [
  { name: 'Thrusters as is', moduleId: 'Thrusters', profile: afterOne, change: none },
  { name: 'Thrusters bay 1', moduleId: 'Thrusters', profile: afterOne, change: () => setMark('Thrusters', 1, { bayUnits: 1 }) },
  { name: 'SolarArray II bay 1', moduleId: 'SolarArray', profile: afterTwo, change: () => setMark('SolarArray', 2, { bayUnits: 1 }) },
  { name: 'Spectrometer II bay 2', moduleId: 'Spectrometer', profile: afterTwo, change: () => setMark('Spectrometer', 2, { bayUnits: 2 }) },
  { name: 'Radar II bay 2', moduleId: 'Radar', profile: afterTwo, change: () => setMark('Radar', 2, { bayUnits: 2 }) },
  { name: 'Radar II value 8', moduleId: 'Radar', profile: afterTwo, change: () => setMark('Radar', 2, { value: 8 }) },
  { name: 'Radar II value 8 bay 2', moduleId: 'Radar', profile: afterTwo, change: () => { const a = setMark('Radar', 2, { value: 8, bayUnits: 2 }); return a } },
  { name: 'RadiationShielding II bay 1', moduleId: 'RadiationShielding', profile: afterTwo, change: () => setMark('RadiationShielding', 2, { bayUnits: 1 }) },
  { name: 'FlightComputer as is', moduleId: 'FlightComputer', profile: afterTwo, change: none },
  { name: 'FlightComputer bay 0', moduleId: 'FlightComputer', profile: afterTwo, change: () => setMark('FlightComputer', 1, { bayUnits: 0 }) },
  { name: 'RepairDrone value 9', moduleId: 'RepairDrone', profile: afterTwo, change: () => setMark('RepairDrone', 1, { value: 9 }) },
  { name: 'MagneticShield II value 10',moduleId: 'MagneticShield', profile: afterTwo, change: () => setMark('MagneticShield', 2, { value: 10 }) },
]

test('variants', () => {
  GameData.install()
  const only = process.env.ONLY?.split(',')
  for (const variant of variants) {
    if (only && !only.some((part) => variant.name.includes(part))) continue
    const undo = variant.change()
    const careful = new PurchaseStudy(new PlannerBot(), new CautiousBot(), [1, 2, 3, 4], flySeeds, 16)
    const careless = new PurchaseStudy(new GreedyBot(), new GreedyBot(), [1, 2, 3, 4], flySeeds, 16)
    const profile = variant.profile()
    const cells = GameData.weeks.availableAt(profile.rank).map((week) => {
      const a = careful.value(profile, variant.moduleId, week)
      const b = careless.value(profile, variant.moduleId, week)
      return `${week.id} careful ${a.without.mean.toFixed(0)}→${a.with.mean.toFixed(0)} ${pct(a.gain)} (${(a.without.completed * 100).toFixed(0)}→${(a.with.completed * 100).toFixed(0)}%) careless ${pct(b.gain)}`
    })
    console.log(`${variant.name}: ${cells.join(' | ')}`)
    undo()
  }
})
