import type { SoundEngine } from '../SoundEngine'
import type { AmbienceBed } from './AmbienceBed'
import { DebriefBed, HangarBed, HomeBed, LabBed, OrbitBed, StormBed } from './AmbienceBeds'

export enum AmbiencePlace {
  Home = 'Home',
  Hangar = 'Hangar',
  Flight = 'Flight',
  Storm = 'Storm',
  Debrief = 'Debrief',
  Lab = 'Lab',
  Silent = 'Silent',
}

export class AmbienceMixer {
  static readonly fade = 1.2
  static readonly horizon = 3
  private current?: AmbienceBed
  private place = AmbiencePlace.Silent
  private orbitSpeed = 0.35
  private storm = 0.4

  constructor(private readonly engine: SoundEngine) {}

  get currentPlace(): AmbiencePlace {
    return this.place
  }

  set(place: AmbiencePlace, at = this.engine.now, fade = AmbienceMixer.fade): void {
    if (place === this.place) return
    this.place = place
    this.current?.stop(at, fade)
    this.current = AmbienceMixer.create(place, this.engine)
    if (!this.current) return
    this.current.setOrbitSpeed(this.orbitSpeed, at)
    this.current.setStorm(this.storm, at)
    this.current.start(at, fade)
    this.current.evolve(at + AmbienceMixer.horizon)
  }

  setOrbitSpeed(speed: number, at = this.engine.now): void {
    this.orbitSpeed = Math.max(0, Math.min(1, speed))
    this.current?.setOrbitSpeed(this.orbitSpeed, at)
  }

  setStorm(level: number, at = this.engine.now): void {
    this.storm = Math.max(0, Math.min(1, level))
    this.current?.setStorm(this.storm, at)
  }

  tick(until = this.engine.now + AmbienceMixer.horizon): void {
    this.current?.evolve(until)
  }

  private static create(place: AmbiencePlace, engine: SoundEngine): AmbienceBed | undefined {
    switch (place) {
      case AmbiencePlace.Home:
        return new HomeBed(engine)
      case AmbiencePlace.Hangar:
        return new HangarBed(engine)
      case AmbiencePlace.Flight:
        return new OrbitBed(engine)
      case AmbiencePlace.Storm:
        return new StormBed(engine)
      case AmbiencePlace.Debrief:
        return new DebriefBed(engine)
      case AmbiencePlace.Lab:
        return new LabBed(engine)
      default:
        return undefined
    }
  }
}
