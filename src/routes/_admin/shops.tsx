import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Key, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { apiClient } from '@/api/client'
import { DataTable } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/_admin/shops')({ component: ShopsPage })

interface ShopGroup { id: number; title: string }
interface Shop {
  id: number
  title: string
  domain: string
  status: string
  note: string | null
  groupId: number
  createdAt: string
  group: { id: number; title: string; currency: string }
}

const schema = z.object({
  groupId: z.coerce.number().min(1, 'Chọn nhóm'),
  title: z.string().min(1, 'Bắt buộc').max(255),
  domain: z.string().min(1, 'Bắt buộc').max(255),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function ShopsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Shop | null>(null)
  const [deleting, setDeleting] = useState<Shop | null>(null)
  const [secretModal, setSecretModal] = useState<{ shopId: number; key: string } | null>(null)
  const [showKey, setShowKey] = useState(false)

  const { data, isLoading } = useQuery<{ items: Shop[]; meta: { total: number; limit: number } }>({
    queryKey: ['shops', page, search],
    queryFn: async () => {
      const res = await apiClient.get('/shops', { params: { page, limit: 20, search: search || undefined } })
      return res.data.data
    },
  })

  const { data: groups } = useQuery<ShopGroup[]>({
    queryKey: ['shop-groups'],
    queryFn: async () => {
      const res = await apiClient.get('/shop-groups')
      return res.data.data
    },
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) return apiClient.patch(`/shops/${editing.id}`, values)
      const res = await apiClient.post('/shops', values)
      if (res.data.data?.secretKey) {
        setSecretModal({ shopId: res.data.data.id, key: res.data.data.secretKey })
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shops'] })
      toast.success(editing ? 'Đã cập nhật' : 'Đã tạo mới')
      handleClose()
    },
    onError: () => toast.error('Có lỗi xảy ra'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/shops/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shops'] }); toast.success('Đã xóa'); setDeleting(null) },
    onError: () => toast.error('Xóa thất bại'),
  })

  const regenMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/shops/${id}/regenerate-key`),
    onSuccess: (res, id) => {
      setSecretModal({ shopId: id, key: res.data.data.secretKey })
      toast.success('Đã tạo key mới')
    },
    onError: () => toast.error('Thất bại'),
  })

  const handleOpen = (shop?: Shop) => {
    setEditing(shop ?? null)
    form.reset(shop ? { groupId: shop.groupId, title: shop.title, domain: shop.domain, note: shop.note ?? '' } : {})
    setFormOpen(true)
  }
  const handleClose = () => { setFormOpen(false); setEditing(null) }

  const columns: ColumnDef<Shop, unknown>[] = [
    { accessorKey: 'id', header: 'ID', cell: ({ getValue }) => <span className="text-gray-400 text-xs">#{getValue<number>()}</span> },
    { accessorKey: 'title', header: 'Tên shop' },
    { accessorKey: 'domain', header: 'Domain', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    { accessorKey: 'group', header: 'Nhóm', cell: ({ getValue }) => getValue<ShopGroup>().title },
    { accessorKey: 'status', header: 'Trạng thái', cell: ({ getValue }) => <StatusBadge active={getValue<string>() === 'ACTIVE'} /> },
    { accessorKey: 'createdAt', header: 'Ngày tạo', cell: ({ getValue }) => formatDate(getValue<string>()) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => regenMutation.mutate(row.original.id)} title="Tạo key mới" className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"><RefreshCw size={14} /></button>
          <button onClick={() => handleOpen(row.original)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleting(row.original)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Shops" description="Quản lý shops" action={
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Tạo mới
        </button>
      } />

      <div className="mb-4">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Tìm kiếm..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <DataTable data={data?.items ?? []} columns={columns} isLoading={isLoading} />
      <Pagination page={page} total={data?.meta.total ?? 0} limit={data?.meta.limit ?? 20} onPageChange={setPage} />

      <Modal open={formOpen} onClose={handleClose} title={editing ? 'Sửa shop' : 'Tạo shop'}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm shop <span className="text-red-500">*</span></label>
            <select {...form.register('groupId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Chọn nhóm --</option>
              {groups?.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
            {form.formState.errors.groupId && <p className="text-xs text-red-500 mt-1">{form.formState.errors.groupId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên shop <span className="text-red-500">*</span></label>
            <input {...form.register('title')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Shop Demo" />
            {form.formState.errors.title && <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain <span className="text-red-500">*</span></label>
            <input {...form.register('domain')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="shop.example.com" />
            {form.formState.errors.domain && <p className="text-xs text-red-500 mt-1">{form.formState.errors.domain.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea {...form.register('note')} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!secretModal} onClose={() => { setSecretModal(null); setShowKey(false) }} title="Secret Key" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">Lưu lại key này, bạn sẽ không thể xem lại sau.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono break-all">
              {showKey ? secretModal?.key : '•'.repeat(40)}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(secretModal?.key ?? ''); toast.success('Đã copy') }} className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <Key size={14} /> Copy key
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
        title="Xóa shop"
        message={`Bạn có chắc muốn xóa shop "${deleting?.title}"?`}
        confirmLabel="Xóa"
      />
    </div>
  )
}
