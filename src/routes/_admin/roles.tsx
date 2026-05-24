import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { apiClient } from '@/api/client'
import { DataTable } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/_admin/roles')({ component: RolesPage })

interface Permission { id: number; name: string; title: string; module: string; action: string }
interface Role {
  id: number
  name: string
  title: string
  createdAt: string
  _count: { userRoles: number; rolePermissions: number }
}

const schema = z.object({
  name: z.string().min(1, 'Bắt buộc').max(100).regex(/^[a-z0-9_]+$/, 'Chỉ chữ thường, số, dấu gạch dưới'),
  title: z.string().min(1, 'Bắt buộc').max(255),
})
type FormValues = z.infer<typeof schema>

function RolesPage() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [permTarget, setPermTarget] = useState<Role | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<number[]>([])

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles')
      return res.data.data
    },
  })

  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await apiClient.get('/permissions')
      return res.data.data
    },
  })

  const form = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => editing
      ? apiClient.patch(`/roles/${editing.id}`, values)
      : apiClient.post('/roles', values),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success(editing ? 'Đã cập nhật' : 'Đã tạo'); handleClose() },
    onError: () => toast.error('Có lỗi xảy ra'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Đã xóa'); setDeleting(null) },
    onError: () => toast.error('Xóa thất bại'),
  })

  const assignPermsMutation = useMutation({
    mutationFn: () => apiClient.put(`/roles/${permTarget!.id}/permissions`, { permissionIds: selectedPerms }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Đã cập nhật permissions'); setPermTarget(null) },
    onError: () => toast.error('Thất bại'),
  })

  const handleOpen = (role?: Role) => {
    setEditing(role ?? null)
    form.reset(role ? { name: role.name, title: role.title } : {})
    setFormOpen(true)
  }
  const handleClose = () => { setFormOpen(false); setEditing(null) }

  const openPermissions = async (role: Role) => {
    setPermTarget(role)
    try {
      const res = await apiClient.get(`/roles/${role.id}`)
      const data = res.data.data
      setSelectedPerms(data.rolePermissions?.map((rp: { permission: Permission }) => rp.permission.id) ?? [])
    } catch {
      setSelectedPerms([])
    }
  }

  const togglePerm = (id: number) => setSelectedPerms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

  const moduleGroups = permissions?.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = []
    acc[p.module].push(p)
    return acc
  }, {} as Record<string, Permission[]>) ?? {}

  const columns: ColumnDef<Role, unknown>[] = [
    { accessorKey: 'id', header: 'ID', cell: ({ getValue }) => <span className="text-gray-400 text-xs">#{getValue<number>()}</span> },
    { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{getValue<string>()}</code> },
    { accessorKey: 'title', header: 'Tên hiển thị' },
    { accessorKey: '_count', header: 'Người dùng', cell: ({ getValue }) => getValue<{ userRoles: number }>().userRoles },
    { accessorKey: '_count', id: 'permissions', header: 'Permissions', cell: ({ getValue }) => getValue<{ rolePermissions: number }>().rolePermissions },
    { accessorKey: 'createdAt', header: 'Ngày tạo', cell: ({ getValue }) => formatDate(getValue<string>()) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => openPermissions(row.original)} title="Gán permissions" className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><ShieldCheck size={14} /></button>
          <button onClick={() => handleOpen(row.original)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleting(row.original)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Roles" description="Quản lý vai trò người dùng" action={
        <button onClick={() => handleOpen()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Tạo mới
        </button>
      } />

      <DataTable data={roles ?? []} columns={columns} isLoading={isLoading} />

      <Modal open={formOpen} onClose={handleClose} title={editing ? 'Sửa role' : 'Tạo role'}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name (slug) <span className="text-red-500">*</span></label>
            <input {...form.register('name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="shop_admin" />
            {form.formState.errors.name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị <span className="text-red-500">*</span></label>
            <input {...form.register('title')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Quản trị viên Shop" />
            {form.formState.errors.title && <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {mutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!permTarget} onClose={() => setPermTarget(null)} title={`Permissions: ${permTarget?.title}`} size="xl">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(moduleGroups).map(([module, perms]) => (
            <div key={module}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{module}</h4>
                <button type="button" onClick={() => {
                  const ids = perms.map(p => p.id)
                  const allSelected = ids.every(id => selectedPerms.includes(id))
                  setSelectedPerms(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])])
                }} className="text-xs text-blue-600 hover:underline">Chọn tất cả</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {perms.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                    <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-gray-400 font-mono">{p.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(moduleGroups).length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có permissions nào</p>}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-500">Đã chọn: {selectedPerms.length}</span>
          <div className="flex gap-3">
            <button onClick={() => setPermTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
            <button onClick={() => assignPermsMutation.mutate()} disabled={assignPermsMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {assignPermsMutation.isPending ? 'Đang lưu...' : 'Lưu permissions'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
        title="Xóa role"
        message={`Bạn có chắc muốn xóa role "${deleting?.title}"?`}
        confirmLabel="Xóa"
      />
    </div>
  )
}
