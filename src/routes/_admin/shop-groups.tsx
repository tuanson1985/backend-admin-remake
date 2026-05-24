import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { apiClient } from '@/api/client'
import { DataTable } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/_admin/shop-groups')({ component: ShopGroupsPage })

interface ShopGroup {
  id: number
  title: string
  currency: string
  timezone: string
  language: string
  createdAt: string
  _count: { shops: number }
}

const schema = z.object({
  title: z.string().min(1, 'Bắt buộc').max(255),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
})
type FormValues = z.infer<typeof schema>

function ShopGroupsPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShopGroup | null>(null)
  const [deleting, setDeleting] = useState<ShopGroup | null>(null)

  const { data, isLoading } = useQuery<ShopGroup[]>({
    queryKey: ['shop-groups'],
    queryFn: async () => {
      const res = await apiClient.get('/shop-groups')
      return res.data.data
    },
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', language: 'vi' } })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) {
        await apiClient.patch(`/shop-groups/${editing.id}`, values)
      } else {
        await apiClient.post('/shop-groups', values)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-groups'] })
      toast.success(editing ? 'Đã cập nhật' : 'Đã tạo mới')
      handleClose()
    },
    onError: () => toast.error('Có lỗi xảy ra'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/shop-groups/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop-groups'] })
      toast.success('Đã xóa')
      setDeleting(null)
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const handleOpen = (group?: ShopGroup) => {
    setEditing(group ?? null)
    form.reset(group ? { title: group.title, currency: group.currency, timezone: group.timezone, language: group.language } : { currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', language: 'vi' })
    setFormOpen(true)
  }

  const handleClose = () => { setFormOpen(false); setEditing(null) }

  const columns: ColumnDef<ShopGroup, unknown>[] = [
    { accessorKey: 'id', header: 'ID', cell: ({ getValue }) => <span className="text-gray-400 text-xs">#{getValue<number>()}</span> },
    { accessorKey: 'title', header: 'Tên nhóm' },
    { accessorKey: 'currency', header: 'Tiền tệ' },
    { accessorKey: 'timezone', header: 'Múi giờ' },
    { accessorKey: '_count', header: 'Số shops', cell: ({ getValue }) => getValue<{ shops: number }>().shops },
    { accessorKey: 'createdAt', header: 'Ngày tạo', cell: ({ getValue }) => formatDate(getValue<string>()) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <button onClick={() => handleOpen(row.original)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleting(row.original)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Shop Groups" description="Quản lý nhóm shop" action={
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Tạo mới
        </button>
      } />

      <DataTable data={data ?? []} columns={columns} isLoading={isLoading} />

      <Modal open={formOpen} onClose={handleClose} title={editing ? 'Sửa nhóm shop' : 'Tạo nhóm shop'}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhóm <span className="text-red-500">*</span></label>
            <input {...form.register('title')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhóm mặc định" />
            {form.formState.errors.title && <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiền tệ</label>
              <input {...form.register('currency')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="VND" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Múi giờ</label>
              <input {...form.register('timezone')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Asia/Ho_Chi_Minh" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngôn ngữ</label>
              <input {...form.register('language')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="vi" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
        title="Xóa nhóm shop"
        message={`Bạn có chắc muốn xóa nhóm "${deleting?.title}"?`}
        confirmLabel="Xóa"
      />
    </div>
  )
}
