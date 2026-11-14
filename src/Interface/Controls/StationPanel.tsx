import { useMemo } from 'react'
import { Catalog } from '../../Engine/Catalog/Catalog'
import { DesignField } from '../../Engine/Design/DesignField'
import { Role } from '../../Engine/Design/Role'
import { ScienceModel } from '../../Engine/Models/ScienceModel'
import { Numbers } from '../../Engine/Numbers'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { CatalogFacts } from '../CatalogFacts'
import { ControlRanges } from '../ControlRanges'
import { useMission } from '../../State/UseMission'
import { RocketSilhouette } from '../Diagrams/RocketSilhouette'
import { InstrumentTable } from './InstrumentTable'
import { OptionList } from './OptionList'
import { RangeField } from './RangeField'
import { ToggleField } from './ToggleField'

const Science = new ScienceModel()

export function StationPanel({ role }: { role: Role }) {
  const translator = useTranslator()
  const design = useGameStore((state) => state.design)
  const focus = useGameStore((state) => state.focusField)
  const edit = useGameStore((state) => state.edit)
  const { scenario, resolved, sheet } = useMission()
  const facts = useMemo(() => new CatalogFacts(translator, resolved), [translator, resolved])
  const catalog = Catalog.shared
  const slices = design.slices
  const common = (field: DesignField) => ({ label: translator.t(`Field.${field}`), highlighted: focus === field })
  const areaRange = ControlRanges.arrayArea(slices.Spacecraft.busId)
  const batteryRange = ControlRanges.battery(slices.Spacecraft.busId)

  const changeBus = (busId: string) =>
    edit('Spacecraft', {
      busId,
      arrayAreaM2: ControlRanges.fit(slices.Spacecraft.arrayAreaM2, ControlRanges.arrayArea(busId)),
      batteryWh: ControlRanges.fit(slices.Spacecraft.batteryWh, ControlRanges.battery(busId)),
    })

  if (role === Role.PrincipalInvestigator) {
    return (
      <div className="StationPanel">
        <InstrumentTable {...common(DesignField.Instruments)} scenario={scenario} selected={slices.Science.instrumentIds} onChange={(instrumentIds) => edit('Science', { instrumentIds })} />
        <RangeField
          {...common(DesignField.DesignLife)}
          value={slices.Science.designLifeYears}
          min={1}
          max={15}
          step={1}
          hint={translator.t('Hint.DesignLife', { target: scenario.spec.targetYears, rated: resolved.bus.maxDesignLifeYears })}
          onChange={(designLifeYears) => edit('Science', { designLifeYears })}
        />
      </div>
    )
  }

  if (role === Role.SpacecraftEngineer) {
    return (
      <div className="StationPanel">
        <OptionList {...common(DesignField.Bus)} value={slices.Spacecraft.busId} options={catalog.buses.items.map((bus) => ({ id: bus.id, name: bus.name, facts: facts.bus(bus) }))} onChange={changeBus} />
        <OptionList
          {...common(DesignField.ArrayType)}
          value={slices.Spacecraft.arrayTypeId}
          options={catalog.solarArrays.items.map((array) => ({ id: array.id, name: array.name, facts: facts.solarArray(array) }))}
          onChange={(arrayTypeId) => edit('Spacecraft', { arrayTypeId })}
        />
        <RangeField
          {...common(DesignField.ArrayArea)}
          {...areaRange}
          value={slices.Spacecraft.arrayAreaM2}
          unit="m²"
          hint={translator.t('Hint.ArrayArea', { available: Numbers.round(sheet.power.availableW), load: Numbers.round(sheet.power.loadW) })}
          onChange={(arrayAreaM2) => edit('Spacecraft', { arrayAreaM2 })}
        />
        <RangeField
          {...common(DesignField.Battery)}
          {...batteryRange}
          value={slices.Spacecraft.batteryWh}
          unit="Wh"
          hint={
            sheet.power.eclipseMin === 0
              ? translator.t('Hint.BatteryUnused')
              : translator.t('Hint.Battery', { dod: Numbers.percent(Math.min(9.99, sheet.power.depthOfDischarge)), safe: Numbers.percent(sheet.power.safeDepthOfDischarge) })
          }
          onChange={(batteryWh) => edit('Spacecraft', { batteryWh })}
        />
        <ToggleField
          {...common(DesignField.Shielding)}
          checked={slices.Spacecraft.shielded}
          hint={translator.t('Hint.Shielding', { years: resolved.orbit.radiationLifeYears(slices.Spacecraft.shielded) })}
          onChange={(shielded) => edit('Spacecraft', { shielded })}
        />
      </div>
    )
  }

  if (role === Role.MissionOps) {
    return (
      <div className="StationPanel">
        <OptionList {...common(DesignField.Orbit)} value={slices.Operations.orbitId} options={catalog.orbits.items.map((orbit) => ({ id: orbit.id, name: orbit.name, facts: facts.orbit(orbit) }))} onChange={(orbitId) => edit('Operations', { orbitId })} />
        <OptionList
          {...common(DesignField.Comms)}
          value={slices.Operations.commsId}
          options={catalog.commsBands.items.map((band) => ({ id: band.id, name: band.name, facts: facts.comms(band), unavailable: resolved.orbit.effectiveRateMbps(band.id, band.dataMbps) === 0 }))}
          onChange={(commsId) => edit('Operations', { commsId })}
        />
        <RangeField
          {...common(DesignField.GroundStations)}
          value={slices.Operations.groundStations}
          min={1}
          max={10}
          step={1}
          hint={translator.t('Hint.GroundStations', { minutes: Numbers.round(sheet.data.contactMinPerDay), downlink: Numbers.round(sheet.data.downlinkGbPerDay), generated: Numbers.round(sheet.data.generatedGbPerDay) })}
          onChange={(groundStations) => edit('Operations', { groundStations })}
        />
      </div>
    )
  }

  const revisit = Science.revisitHours(resolved)
  return (
    <div className="StationPanel">
      <OptionList
        {...common(DesignField.LaunchVehicle)}
        layout="Columns"
        value={slices.Program.launchVehicleId}
        options={catalog.launchVehicles.items.map((vehicle) => ({
          id: vehicle.id,
          name: vehicle.name,
          facts: facts.vehicle(vehicle, sheet.mass.launchMassKg),
          unavailable: !vehicle.canReach(resolved.orbit),
          visual: <RocketSilhouette vehicleId={vehicle.id} />,
        }))}
        onChange={(launchVehicleId) => edit('Program', { launchVehicleId })}
      />
      <RangeField
        {...common(DesignField.Copies)}
        value={slices.Program.copies}
        min={1}
        max={scenario.spec.maxCopies}
        step={1}
        hint={
          Number.isFinite(revisit)
            ? translator.t('Hint.Copies', { revisit: Numbers.round(revisit, 1), required: scenario.spec.requiredRevisitHours })
            : translator.t('Hint.NoView')
        }
        onChange={(copies) => edit('Program', { copies })}
      />
    </div>
  )
}
