import type { ReactNode } from 'react'

export interface Option {
  id: string
  name: string
  facts: readonly string[]
  unavailable?: boolean
  visual?: ReactNode
}

interface OptionListProps {
  label: string
  value: string
  options: readonly Option[]
  layout?: 'Rows' | 'Columns'
  disabled?: boolean
  highlighted?: boolean
  onChange(id: string): void
}

export function OptionList({ label, value, options, layout = 'Rows', disabled, highlighted, onChange }: OptionListProps) {
  return (
    <fieldset className={`Control OptionList Is${layout} ${highlighted ? 'IsHighlighted' : ''}`} disabled={disabled}>
      <legend>{label}</legend>
      <div className="Options" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === value}
            className={`Option ${option.unavailable ? 'IsUnavailable' : ''}`}
            onClick={() => onChange(option.id)}
          >
            {option.visual}
            <span className="OptionName">{option.name}</span>
            {option.facts.map((fact) => <span key={fact} className="OptionFact">{fact}</span>)}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
