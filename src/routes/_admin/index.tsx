import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Users, ShoppingBag, Store, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_admin/')({
  component: DashboardPage,
})

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function DashboardPage() {
  const { data: shops } = useQuery({
    queryKey: ['shops', 'count'],
    queryFn: async () => (await apiClient.get('/shops?limit=1')).data.data,
  })
  const { data: users } = useQuery({
    queryKey: ['users', 'count'],
    queryFn: async () => (await apiClient.get('/users?limit=1')).data.data,
  })
  const { data: roles } = useQuery({
    queryKey: ['roles', 'count'],
    queryFn: async () => (await apiClient.get('/roles')).data.data,
  })
  const { data: permissions } = useQuery({
    queryKey: ['permissions', 'count'],
    queryFn: async () => (await apiClient.get('/permissions')).data.data,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tổng shops" value={shops?.meta?.total ?? '—'} icon={ShoppingBag} color="bg-blue-500" />
        <StatCard label="Tổng users" value={users?.meta?.total ?? '—'} icon={Users} color="bg-green-500" />
        <StatCard label="Tổng roles" value={Array.isArray(roles) ? roles.length : '—'} icon={Store} color="bg-purple-500" />
        <StatCard label="Tổng permissions" value={Array.isArray(permissions) ? permissions.length : '—'} icon={Key} color="bg-orange-500" />
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Hệ thống sẵn sàng</h2>
        <p className="text-gray-500 text-sm">Backend API đang chạy tại <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">http://localhost:3000/api/v1</code></p>
      </div>
    </div>
  )
}
