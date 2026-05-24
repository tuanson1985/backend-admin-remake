import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Info } from 'lucide-react'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/store/auth.store'
import { PageHeader } from '@/components/common/PageHeader'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/_admin/settings')({ component: SettingsPage })

interface Setting { id: number; key: string; value: string; updatedAt: string }

function SettingsPage() {
  const { user } = useAuthStore()
  const shopId = user?.shopId ?? null

  const { data, isLoading, refetch } = useQuery<Setting[]>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings')
      return res.data.data
    },
    enabled: shopId !== null,
    retry: false,
  })

  const [rows, setRows] = useState<{ key: string; value: string }[]>([])
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  useEffect(() => {
    if (data) setRows(data.map(s => ({ key: s.key, value: s.value })))
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => apiClient.put('/settings', {
      settings: rows.map(r => ({ key: r.key, value: r.value })),
    }),
    onSuccess: () => { toast.success('Đã lưu cài đặt'); refetch() },
    onError: () => toast.error('Lưu thất bại'),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiClient.delete(`/settings/${key}`),
    onSuccess: (_, key) => {
      setRows(prev => prev.filter(r => r.key !== key))
      toast.success('Đã xóa')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const addRow = () => {
    if (!newKey.trim()) return toast.error('Key không được để trống')
    if (rows.some(r => r.key === newKey.trim())) return toast.error('Key đã tồn tại')
    setRows(prev => [...prev, { key: newKey.trim(), value: newValue }])
    setNewKey('')
    setNewValue('')
  }

  if (shopId === null) {
    return (
      <div>
        <PageHeader title="Settings" description="Cài đặt theo shop" />
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-3">
          <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Settings chỉ áp dụng cho shop cụ thể</p>
            <p className="text-sm text-blue-700 mt-1">Tài khoản hệ thống (không thuộc shop nào) không thể quản lý settings. Hãy đăng nhập bằng tài khoản của một shop cụ thể để sử dụng tính năng này.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Settings" description="Cài đặt key-value theo shop" action={
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <Save size={16} /> {saveMutation.isPending ? 'Đang lưu...' : 'Lưu tất cả'}
        </button>
      } />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-1/3">Key</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Value</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>
                <td />
              </tr>
            ))}
            {rows.map((row, i) => (
              <tr key={row.key} className="border-b border-gray-100">
                <td className="px-4 py-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{row.key}</code>
                </td>
                <td className="px-4 py-2">
                  <input
                    value={row.value}
                    onChange={(e) => setRows(prev => prev.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => deleteMutation.mutate(row.key)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {/* New row */}
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className="px-4 py-2">
                <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key_mới" className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </td>
              <td className="px-4 py-2">
                <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Giá trị" onKeyDown={(e) => e.key === 'Enter' && addRow()} className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </td>
              <td className="px-4 py-2">
                <button onClick={addRow} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <Plus size={14} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        {!isLoading && rows.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">Chưa có cài đặt nào. Thêm mới bên trên.</p>
        )}
      </div>
    </div>
  )
}
