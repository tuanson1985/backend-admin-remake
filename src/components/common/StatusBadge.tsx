import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}

export function StatusBadge({ active, activeLabel = 'Hoạt động', inactiveLabel = 'Tạm khóa' }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', active ? 'bg-green-500' : 'bg-red-500')} />
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}
