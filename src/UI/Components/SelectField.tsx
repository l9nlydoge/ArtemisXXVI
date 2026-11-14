import type { CatalogItem } from '../../Engine/Catalog/CatalogItem'

interface SelectFieldProps {
  label: string
  value: string
  items: readonly CatalogItem[]
  disabled?: boolean
  highlighted?: boolean
  onChange(id: string): void
}

export function SelectField({ label, value, items, disabled, highlighted, onChange }: SelectFieldProps) {
  return (
    <label className={`Field ${highlighted ? 'IsHighlighted' : ''}`}>
      <span className="FieldLabel">{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {items.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
    </label>
  )
}
