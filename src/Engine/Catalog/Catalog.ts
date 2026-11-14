import { Bus } from './Bus'
import { CommsBand } from './CommsBand'
import { Instrument } from './Instrument'
import { DedicatedPricing, RidesharePricing } from './LaunchPricing'
import { LaunchVehicle } from './LaunchVehicle'
import { Orbit } from './Orbit'
import { CapacityClass, OrbitClass } from './OrbitClass'
import { ReferenceFactKey, ReferenceMission } from './ReferenceMission'
import { Registry } from './Registry'
import { Scenario } from './Scenario'
import { SolarArrayType } from './SolarArrayType'
import { Sources } from './Sources'

export class Catalog {
  static readonly shared = new Catalog()

  readonly launchVehicles = new Registry<LaunchVehicle>([
    new LaunchVehicle('Rideshare', 'SpaceX Rideshare', { [CapacityClass.Sso]: 300 }, new RidesharePricing(0.35, 50, 0.007), 0.01, [Sources.Rideshare], true),
    new LaunchVehicle('Electron', 'Rocket Lab Electron', { [CapacityClass.Leo]: 300, [CapacityClass.Sso]: 200 }, new DedicatedPricing(7.5), 0.06, [Sources.Electron, Sources.ElectronWiki], true),
    new LaunchVehicle('VegaC', 'Vega-C', { [CapacityClass.Leo]: 3300, [CapacityClass.Sso]: 2300 }, new DedicatedPricing(52), 0.07, [Sources.VegaC, Sources.VegaCWiki], true),
    new LaunchVehicle('Falcon9', 'Falcon 9', { [CapacityClass.Leo]: 17500, [CapacityClass.Sso]: 12000, [CapacityClass.Gto]: 5500, [CapacityClass.Escape]: 3000 }, new DedicatedPricing(74), 0.01, [Sources.Falcon9Wiki, Sources.Falcon9Price], true),
    new LaunchVehicle('Ariane64', 'Ariane 64', { [CapacityClass.Leo]: 21600, [CapacityClass.Sso]: 15500, [CapacityClass.Gto]: 11500, [CapacityClass.Escape]: 6300 }, new DedicatedPricing(125), 0.03, [Sources.Ariane64, Sources.Ariane6Wiki], true),
  ])

  readonly orbits = new Registry<Orbit>([
    new Orbit('Leo450', 'Low Earth orbit, 450 km', {
      orbitClass: OrbitClass.Leo, altitudeKm: 450, inclinationDeg: 30, capacityClass: CapacityClass.Leo, periodMin: 93.4, eclipseMin: 36,
      contactMinPerStation: 50, continuousContact: false, rateFactor: 1, bandRateCapsMbps: {},
      insertionDvMs: 0, keepingDvMsPerYear: 25, radiationLifeYears: 15, shieldedRadiationLifeYears: 15,
      safeDepthOfDischarge: 0.25, dragEventsPossible: true,
    }, [Sources.OrbitTypes, Sources.GroundPasses, Sources.OrbitalDebris, Sources.BatteryDepth]),
    new Orbit('Sso705', 'Sun-synchronous, 705 km', {
      orbitClass: OrbitClass.Sso, altitudeKm: 705, inclinationDeg: 98.2, capacityClass: CapacityClass.Sso, periodMin: 98.8, eclipseMin: 35,
      contactMinPerStation: 60, continuousContact: false, rateFactor: 1, bandRateCapsMbps: {},
      insertionDvMs: 0, keepingDvMsPerYear: 5, radiationLifeYears: 15, shieldedRadiationLifeYears: 15,
      safeDepthOfDischarge: 0.25, dragEventsPossible: false,
    }, [Sources.Landsat8Orbit, Sources.OrbitTypes, Sources.Radiation]),
    new Orbit('Geo', 'Geostationary, 35,786 km', {
      orbitClass: OrbitClass.Geo, altitudeKm: 35786, inclinationDeg: 0, capacityClass: CapacityClass.Gto, periodMin: 1436, eclipseMin: 72,
      contactMinPerStation: 1440, continuousContact: true, rateFactor: 0.25, bandRateCapsMbps: {},
      insertionDvMs: 1500, keepingDvMsPerYear: 50, radiationLifeYears: 3, shieldedRadiationLifeYears: 12,
      safeDepthOfDischarge: 0.6, dragEventsPossible: false,
    }, [Sources.OrbitTypes, Sources.GeoEclipse, Sources.DeltaV, Sources.Radiation]),
    new Orbit('L2', 'Sun–Earth L2', {
      orbitClass: OrbitClass.L2, altitudeKm: 1500000, inclinationDeg: 0, capacityClass: CapacityClass.Escape, periodMin: 262980, eclipseMin: 0,
      contactMinPerStation: 160, continuousContact: false, rateFactor: 1,
      bandRateCapsMbps: { Uhf: 0, SBand: 0, XBand: 2, KaBand: 28, Laser: 0 },
      insertionDvMs: 0, keepingDvMsPerYear: 4, radiationLifeYears: 10, shieldedRadiationLifeYears: 12,
      safeDepthOfDischarge: 0.6, dragEventsPossible: false,
    }, [Sources.WebbOrbit, Sources.WebbKaBand, Sources.DeltaV]),
  ])

  readonly instruments = new Registry<Instrument>([
    new Instrument('LandsatImager', 'Landsat-class Imager', 400, 425, 261, 0.2, 180, 100, [Sources.Oli], true),
    new Instrument('ThermalImager', 'Thermal Imager', 236, 380, 26, 0.2, 120, 50, [Sources.Tirs], true),
    new Instrument('MicrowaveSounder', 'Microwave Sounder', 85, 130, 0.032, 1, 60, 60, [Sources.Atms], true),
    new Instrument('MiniRadiometer', 'Mini Microwave Radiometer', 1.5, 10, 0.1, 1, 3, 25, [Sources.Tropics], true),
    new Instrument('CubeCamera', 'CubeSat Camera', 1.5, 8, 50, 0.25, 1, 20, [Sources.Planet], true),
    new Instrument('Radar', 'Imaging Radar (SAR)', 1000, 4000, 2000, 0.15, 400, 120, [Sources.Nisar], true),
  ])

  readonly buses = new Registry<Bus>([
    new Bus('CubeSat6U', '6U CubeSat', 6, 4, 5, 2, 3),
    new Bus('SmallSat', 'SmallSat', 100, 100, 80, 25, 5),
    new Bus('Medium', 'Medium Bus', 700, 600, 300, 90, 10),
    new Bus('Large', 'Large Bus', 1300, 1200, 500, 130, 15, [Sources.Landsat9Cost]),
  ])

  readonly commsBands = new Registry<CommsBand>([
    new CommsBand('Uhf', 'UHF', 0.0096, 0.5, 4, 0.1, 1, [Sources.SmallSatComms]),
    new CommsBand('SBand', 'S-band', 2, 1, 10, 0.5, 1, [Sources.SmallSatComms]),
    new CommsBand('XBand', 'X-band', 384, 3, 30, 3, 1, [Sources.Landsat8]),
    new CommsBand('KaBand', 'Ka-band', 1000, 6, 50, 8, 1, [Sources.SmallSatComms, Sources.WebbKaBand]),
    new CommsBand('Laser', 'Laser Terminal', 200000, 3, 30, 10, 0.1, [Sources.Tbird]),
  ])

  readonly solarArrays = new Registry<SolarArrayType>([
    new SolarArrayType('Rigid', 'Rigid Panels', 350, 11.7, 0.5, [Sources.SmallSatPower]),
    new SolarArrayType('RollOut', 'Roll-Out Array', 350, 3.5, 1.5, [Sources.SmallSatPower]),
  ])

  readonly scenarios = new Registry<Scenario>([
    new Scenario('CropWatch', 'Crop Watch', 'Map the world’s farmland every 8 days for 5 years.', {
      budgetMusd: 600, targetYears: 5, requiredScience: 220, requiredRevisitHours: 192, maxCopies: 12,
      instrumentFit: { LandsatImager: 1, ThermalImager: 0.6, CubeCamera: 0.3, Radar: 0.8, MicrowaveSounder: 0.1, MiniRadiometer: 0.05 },
      orbitFit: { [OrbitClass.Sso]: 1, [OrbitClass.Leo]: 0.7, [OrbitClass.Geo]: 0.1, [OrbitClass.L2]: 0 },
      orbitRevisitHours: { [OrbitClass.Sso]: 384, [OrbitClass.Leo]: 384, [OrbitClass.Geo]: 1, [OrbitClass.L2]: Number.POSITIVE_INFINITY },
    }, new ReferenceMission('Landsat 9', [
      { key: ReferenceFactKey.Mass, value: '2,710 kg', source: Sources.Landsat9Facts },
      { key: ReferenceFactKey.Orbit, value: '705 km sun-synchronous, 8-day revisit with Landsat 8', source: Sources.Landsat9 },
      { key: ReferenceFactKey.Instruments, value: 'OLI-2 + TIRS-2', source: Sources.Landsat9 },
      { key: ReferenceFactKey.Downlink, value: 'X-band 384 Mbps', source: Sources.Landsat8 },
      { key: ReferenceFactKey.DesignLife, value: '5 years, consumables for 10', source: Sources.Landsat9 },
      { key: ReferenceFactKey.Launch, value: 'Atlas V 401, $153.8M', source: Sources.Landsat9Launch },
      { key: ReferenceFactKey.Cost, value: '$885M life-cycle', source: Sources.Landsat9Cost },
    ], 'One big, capable, long-lived satellite.')),
    new Scenario('StormChaser', 'Storm Chaser', 'Look inside tropical storms at least every 2 hours for 2 years.', {
      budgetMusd: 60, targetYears: 2, requiredScience: 120, requiredRevisitHours: 2, maxCopies: 12,
      instrumentFit: { MicrowaveSounder: 1, MiniRadiometer: 0.8, Radar: 0.3, ThermalImager: 0.3, LandsatImager: 0.2, CubeCamera: 0.2 },
      orbitFit: { [OrbitClass.Leo]: 1, [OrbitClass.Sso]: 0.8, [OrbitClass.Geo]: 0.4, [OrbitClass.L2]: 0 },
      orbitRevisitHours: { [OrbitClass.Leo]: 8, [OrbitClass.Sso]: 10, [OrbitClass.Geo]: 0.5, [OrbitClass.L2]: Number.POSITIVE_INFINITY },
    }, new ReferenceMission('NASA TROPICS', [
      { key: ReferenceFactKey.Mass, value: '~5.4 kg each', source: Sources.Tropics },
      { key: ReferenceFactKey.Orbit, value: '550 km, ~30° inclination', source: Sources.Tropics },
      { key: ReferenceFactKey.Instruments, value: 'One microwave radiometer, 90–205 GHz', source: Sources.Tropics },
      { key: ReferenceFactKey.Launch, value: 'Rocket Lab Electron', source: Sources.Tropics },
      { key: ReferenceFactKey.Cost, value: '~$30M', source: Sources.TropicsCost },
    ], 'Many tiny satellites beat one big one when revisit matters.')),
  ])
}
