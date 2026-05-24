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
import toast from 'react-hot-toast'

export const Route = createFileRoute('/_admin/permissions')({ component: PermissionsPage })

interface Permission {
  id: number
  name: string
  title: string
  module: string
  action: string
  order: number
}

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc').regex(/^[a-z0-9_:]+$/, 'Chỉ chữ thường, số, dấu gạch dưới, dấu hai chấm'),
  title: z.string().min(1, 'Bắt buộc').max(255),
  module: z.string().min(1, 'Bắt buộc').max(100),
  action: z.string().min(1, 'Bắt buộc').max(100),
  order: z.coerce.number().int().default(0),
})
type FormValues = z.infer<typeof schema>

function PermissionsPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Permission | null>(null)
  const [deleting, setDeleting] = useState<Permission | null>(null)
  const [filterModule, setFilterModule] = useState('')

  const { data, isLoading } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await apiClient.get('/permissions')
      return res.data.data
    },
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { order: 0 } })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => editing
      ? apiClient.patch(`/permissions/${editing.id}`, values)
      : apiClient.post('/permissions', values),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['permissions'] }); toast.success(editing ? 'Đã cập nhật' : 'Đã tạo'); handleClose() },
    onError: () => toast.error('Có lỗi xảy ra'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/permissions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['permissions'] }); toast.success('Đã xóa'); setDeleting(null) },
    onError: () => toast.error('Xóa thất bại'),
  })

  const handleOpen = (perm?: Permission) => {
    setEditing(perm ?? null)
    form.reset(perm ? { name: perm.name, title: perm.title, module: perm.module, action: perm.action, order: perm.order } : { order: 0 })
    setFormOpen(true)
  }
  const handleClose = () => { setFormOpen(false); setEditing(null) }

  const modules = [...new Set(data?.map(p => p.module) ?? [])]
  const filtered = filterModule ? (data?.filter(p => p.module === filterModule) ?? []) : (data ?? [])

  const columns: ColumnDef<Permission, unknown>[] = [
    { accessorKey: 'id', header: 'ID', cell: ({ getValue }) => <span className="text-gray-400 text-xs">#{getValue<number>()}</span> },
    { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{getValue<string>()}</code> },
    { accessorKey: 'title', header: 'Tên' },
    { accessorKey: 'module', header: 'Module', cell: ({ getValue }) => <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{getValue<string>()}</span> },
    { accessorKey: 'action', header: 'Action', cell: ({ getValue }) => <span className="inline-flex px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">{getValue<string>()}</span> },
    { accessorKey: 'order', header: 'Thứ tự' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => handleOpen(row.original)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleting(row.original)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Permissions" description="Quản lý quyền hạn hệ thống" action={
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Tạo mới
        </button>
      } />

      <div className="mb-4 flex gap-3 items-center">
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả module</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} quyền</span>
      </div>

      <DataTable data={filtered} columns={columns} isLoading={isLoading} />

      <Modal open={formOpen} onClose={handleClose} title={editing ? 'Sửa permission' : 'Tạo permission'}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input {...form.register('name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="users:create" />
            {form.formState.errors.name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị <span className="text-red-500">*</span></label>
            <input {...form.register('title')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tạo người dùng" />
            {form.formState.errors.title && <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module <span className="text-red-500">*</span></label>
              <input {...form.register('module')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="users" />
              {form.formState.errors.module && <p className="text-xs text-red-500 mt-1">{form.formState.errors.module.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action <span className="text-red-500">*</span></label>
              <input {...form.register('action')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="create" />
              {form.formState.errors.action && <p className="text-xs text-red-500 mt-1">{form.formState.errors.action.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
              <input {...form.register('order')} type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
        title="Xóa permission"
        message={`Bạn có chắc muốn xóa permission "${deleting?.name}"?`}
        confirmLabel="Xóa"
      />
    </div>
  )
}
