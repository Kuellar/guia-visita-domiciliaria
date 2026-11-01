import type { Option } from '../domain/types'

interface Props {
  options: Option[]
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
}

/** Botones grandes (fáciles de tocar en terreno) en vez de listas desplegables. */
export function OptionPicker({ options, value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              selected
                ? 'border-brand-600 bg-brand-600 font-medium text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-brand-500 hover:bg-brand-50'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
