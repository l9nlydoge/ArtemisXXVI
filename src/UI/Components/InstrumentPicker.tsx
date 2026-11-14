import { Catalog } from '../../Engine/Catalog/Catalog'

interface InstrumentPickerProps {
  label: string
  selected: readonly string[]
  disabled?: boolean
  highlighted?: boolean
  onChange(ids: string[]): void
}

export function InstrumentPicker({ label, selected, disabled, highlighted, onChange }: InstrumentPickerProps) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  return (
    <fieldset className={`Field InstrumentPicker ${highlighted ? 'IsHighlighted' : ''}`} disabled={disabled}>
      <legend className="FieldLabel">{label}</legend>
      {Catalog.shared.instruments.items.map((instrument) => (
        <button
          key={instrument.id}
          type="button"
          className={`Chip ${selected.includes(instrument.id) ? 'IsSelected' : ''}`}
          aria-pressed={selected.includes(instrument.id)}
          onClick={() => toggle(instrument.id)}
        >
          <span>{instrument.name}</span>
          <small className="Numeric">{instrument.massKg} kg · {instrument.powerW} W</small>
        </button>
      ))}
    </fieldset>
  )
}
