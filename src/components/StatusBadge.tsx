import type { Status } from '../domain/types'

const STYLES: Record<Status, string> = {
  LISTO: 'bg-emerald-100 text-emerald-800',
  PENDIENTE: 'bg-amber-100 text-amber-800',
  'EN ESPERA': 'bg-slate-100 text-slate-500',
  'NO APLICA': 'bg-slate-100 text-slate-400',
  REVISAR: 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${STYLES[status]}`}>
      {status}
    </span>
  )
}
