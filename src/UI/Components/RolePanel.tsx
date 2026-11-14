import { Catalog } from '../../Engine/Catalog/Catalog'
import { DesignField } from '../../Engine/Design/DesignField'
import { Role } from '../../Engine/Design/Role'
import { useTranslator } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { InstrumentPicker } from './InstrumentPicker'
import { RangeField } from './RangeField'
import { SelectField } from './SelectField'
import { ToggleField } from './ToggleField'

interface RolePanelProps {
  role: Role
  editable: boolean
}

export function RolePanel({ role, editable }: RolePanelProps) {
  const translator = useTranslator()
  const design = useGameStore((state) => state.design)
  const focus = useGameStore((state) => state.focusField)
  const scenarioId = useGameStore((state) => state.scenarioId)
  const edit = useGameStore((state) => state.edit)
  const catalog = Catalog.shared
  const { Science, Spacecraft, Operations, Program } = design.slices
  const label = (field: DesignField) => translator.t(`Field.${field}`)
  const common = (field: DesignField) => ({ label: label(field), disabled: !editable, highlighted: focus === field })

  return (
    <section className={`RolePanel Role${role}`}>
      <h2>{translator.t(`Role.${role}`)}</h2>
      {role === Role.PrincipalInvestigator && (
        <>
          <InstrumentPicker {...common(DesignField.Instruments)} selected={Science.instrumentIds} onChange={(instrumentIds) => edit('Science', { instrumentIds })} />
          <RangeField {...common(DesignField.DesignLife)} value={Science.designLifeYears} min={1} max={15} step={1} onChange={(designLifeYears) => edit('Science', { designLifeYears })} />
        </>
      )}
      {role === Role.SpacecraftEngineer && (
        <>
          <SelectField {...common(DesignField.Bus)} value={Spacecraft.busId} items={catalog.buses.items} onChange={(busId) => edit('Spacecraft', { busId })} />
          <SelectField {...common(DesignField.ArrayType)} value={Spacecraft.arrayTypeId} items={catalog.solarArrays.items} onChange={(arrayTypeId) => edit('Spacecraft', { arrayTypeId })} />
          <RangeField {...common(DesignField.ArrayArea)} value={Spacecraft.arrayAreaM2} min={0.05} max={40} step={0.05} unit="m²" onChange={(arrayAreaM2) => edit('Spacecraft', { arrayAreaM2 })} />
          <RangeField {...common(DesignField.Battery)} value={Spacecraft.batteryWh} min={10} max={20000} step={10} unit="Wh" onChange={(batteryWh) => edit('Spacecraft', { batteryWh })} />
          <ToggleField {...common(DesignField.Shielding)} checked={Spacecraft.shielded} onChange={(shielded) => edit('Spacecraft', { shielded })} />
        </>
      )}
      {role === Role.MissionOps && (
        <>
          <SelectField {...common(DesignField.Orbit)} value={Operations.orbitId} items={catalog.orbits.items} onChange={(orbitId) => edit('Operations', { orbitId })} />
          <SelectField {...common(DesignField.Comms)} value={Operations.commsId} items={catalog.commsBands.items} onChange={(commsId) => edit('Operations', { commsId })} />
          <RangeField {...common(DesignField.GroundStations)} value={Operations.groundStations} min={1} max={10} step={1} onChange={(groundStations) => edit('Operations', { groundStations })} />
        </>
      )}
      {role === Role.ProgramManager && (
        <>
          <SelectField {...common(DesignField.LaunchVehicle)} value={Program.launchVehicleId} items={catalog.launchVehicles.items} onChange={(launchVehicleId) => edit('Program', { launchVehicleId })} />
          <RangeField {...common(DesignField.Copies)} value={Program.copies} min={1} max={catalog.scenarios.get(scenarioId).spec.maxCopies} step={1} onChange={(copies) => edit('Program', { copies })} />
        </>
      )}
    </section>
  )
}
