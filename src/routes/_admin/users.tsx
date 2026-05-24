import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, KeyRound, Wallet } from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import { apiClient } from '@/api/client'
import { DataTable } from '@/components/common/DataTable'
import { PageHeader } from '@/components/common/PageHeader'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/_admin/users')({ component: UsersPage })

interface User {
  id: number
  username: string
  email: string
  balance: string
  status: string
  isFirstLogin: boolean
  lastLoginAt: string | null
  createdAt: string
  profile: { firstName: string | null; lastName: string | null; phone: string | null } | null
}

const createSchema = z.object({
  username: z.string().min(1, 'Bắt buộc').max(255),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Ít nhất 6 ký tự'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
})
type CreateFormValues = z.infer<typeof createSchema>

const updateSchema = z.object({
  email: z.string().email('Email không hợp lệ').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
type UpdateFormValues = z.infer<typeof updateSchema>

const resetSchema = z.object({ newPassword: z.string().min(6, 'Ít nhất 6 ký tự') })
const balanceSchema = z.object({ amount: z.coerce.number().positive('Phải lớn hơn 0'), note: z.string().optional() })

function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [balanceTarget, setBalanceTarget] = useState<{ user: User; type: 'topup' | 'deduct' } | null>(null)

  const { data, isLoading } = useQuery<{ items: User[]; meta: { total: number; limit: number } }>({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const res = await apiClient.get('/users', { params: { page, limit: 20, search: search || undefined } })
      return res.data.data
    },
  })

  const createForm = useForm<CreateFormValues>({ resolver: zodResolver(createSchema), defaultValues: { status: 'active' } })
  const updateForm = useForm<UpdateFormValues>({ resolver: zodResolver(updateSchema) })
  const resetForm = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) })
  const balanceForm = useForm<z.infer<typeof balanceSchema>>({ resolver: zodResolver(balanceSchema) })

  const createMutation = useMutation({
    mutationFn: (values: CreateFormValues) => apiClient.post('/users', values),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Đã tạo người dùng'); setCreateOpen(false); createForm.reset() },
    onError: () => toast.error('Có lỗi xảy ra'),
  })

  const updateMutation = useMutation({
    mutationFn: (values: UpdateFormValues) => apiClient.patch(`/users/${editing!.id}`, values),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Đã cập nhật'); setEditing(null) },
    onError: () => toast.error('Có lỗi xảy ra'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Đã xóa'); setDeleting(null) },
    onError: () => toast.error('Xóa thất bại'),
  })

  const resetMutation = useMutation({
    mutationFn: (values: { newPassword: string }) => apiClient.post(`/users/${resetTarget!.id}/reset-password`, values),
    onSuccess: () => { toast.success('Đã đặt lại mật khẩu'); setResetTarget(null); resetForm.reset() },
    onError: () => toast.error('Thất bại'),
  })

  const balanceMutation = useMutation({
    mutationFn: (values: { amount: number; note?: string }) => {
      const url = `/users/${balanceTarget!.user.id}/balance/${balanceTarget!.type === 'topup' ? 'topup' : 'deduct'}`
      return apiClient.post(url, values)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Thành công'); setBalanceTarget(null); balanceForm.reset() },
    onError: () => toast.error('Thất bại'),
  })

  const openEdit = (user: User) => {
    setEditing(user)
    updateForm.reset({ email: user.email, firstName: user.profile?.firstName ?? '', lastName: user.profile?.lastName ?? '', phone: user.profile?.phone ?? '', status: user.status as 'active' | 'inactive' })
  }

  const columns: ColumnDef<User, unknown>[] = [
    { accessorKey: 'id', header: 'ID', cell: ({ getValue }) => <span className="text-gray-400 text-xs">#{getValue<number>()}</span> },
    { accessorKey: 'username', header: 'Username', cell: ({ row, getValue }) => (
      <div>
        <div className="font-medium">{getValue<string>()}</div>
        <div className="text-xs text-gray-400">{row.original.email}</div>
      </div>
    )},
    { accessorKey: 'balance', header: 'Số dư', cell: ({ getValue }) => <span className="font-medium text-green-700">{formatCurrency(Number(getValue<string>()))}</span> },
    { accessorKey: 'status', header: 'Trạng thái', cell: ({ getValue }) => <StatusBadge active={getValue<string>() === 'active'} /> },
    { accessorKey: 'lastLoginAt', header: 'Đăng nhập lần cuối', cell: ({ getValue }) => getValue<string | null>() ? formatDate(getValue<string>()) : <span className="text-gray-400 text-xs">Chưa</span> },
    { accessorKey: 'createdAt', header: 'Ngày tạo', cell: ({ getValue }) => formatDate(getValue<string>()) },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1.5 justify-end">
          <button onClick={() => setBalanceTarget({ user: row.original, type: 'topup' })} title="Nạp tiền" className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Wallet size={14} /></button>
          <button onClick={() => setResetTarget(row.original)} title="Đặt lại mật khẩu" className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"><KeyRound size={14} /></button>
          <button onClick={() => openEdit(row.original)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => setDeleting(row.original)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Người dùng" description="Quản lý tài khoản người dùng" action={
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Tạo mới
        </button>
      } />

      <div className="mb-4">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Tìm kiếm username, email..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <DataTable data={data?.items ?? []} columns={columns} isLoading={isLoading} />
      <Pagination page={page} total={data?.meta.total ?? 0} limit={data?.meta.limit ?? 20} onPageChange={setPage} />

      {/* Create */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); createForm.reset() }} title="Tạo người dùng" size="lg">
        <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
              <input {...createForm.register('username')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {createForm.formState.errors.username && <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.username.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input {...createForm.register('email')} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {createForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
              <input {...createForm.register('password')} type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {createForm.formState.errors.password && <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.password.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select {...createForm.register('status')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Hoạt động</option>
                <option value="inactive">Tạm khóa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ</label>
              <input {...createForm.register('firstName')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
              <input {...createForm.register('lastName')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setCreateOpen(false); createForm.reset() }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Sửa người dùng">
        <form onSubmit={updateForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input {...updateForm.register('email')} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ</label>
              <input {...updateForm.register('firstName')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
              <input {...updateForm.register('lastName')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select {...updateForm.register('status')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm khóa</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
            <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset password */}
      <Modal open={!!resetTarget} onClose={() => { setResetTarget(null); resetForm.reset() }} title="Đặt lại mật khẩu" size="sm">
        <form onSubmit={resetForm.handleSubmit((v) => resetMutation.mutate(v))} className="space-y-4">
          <p className="text-sm text-gray-600">Đặt lại mật khẩu cho <strong>{resetTarget?.username}</strong></p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới <span className="text-red-500">*</span></label>
            <input {...resetForm.register('newPassword')} type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {resetForm.formState.errors.newPassword && <p className="text-xs text-red-500 mt-1">{resetForm.formState.errors.newPassword.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setResetTarget(null); resetForm.reset() }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
            <button type="submit" disabled={resetMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {resetMutation.isPending ? 'Đang đặt...' : 'Đặt lại'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Balance */}
      <Modal open={!!balanceTarget} onClose={() => { setBalanceTarget(null); balanceForm.reset() }} title={balanceTarget?.type === 'topup' ? 'Nạp tiền' : 'Trừ tiền'} size="sm">
        <form onSubmit={balanceForm.handleSubmit((v) => balanceMutation.mutate(v))} className="space-y-4">
          <p className="text-sm text-gray-600">
            {balanceTarget?.type === 'topup' ? 'Nạp tiền cho' : 'Trừ tiền từ'} <strong>{balanceTarget?.user.username}</strong>
            {' — Số dư: '}<span className="font-medium text-green-700">{formatCurrency(Number(balanceTarget?.user.balance ?? 0))}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền <span className="text-red-500">*</span></label>
            <input {...balanceForm.register('amount')} type="number" min="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="50000" />
            {balanceForm.formState.errors.amount && <p className="text-xs text-red-500 mt-1">{balanceForm.formState.errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <input {...balanceForm.register('note')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setBalanceTarget(null); balanceForm.reset() }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
            <button type="submit" disabled={balanceMutation.isPending} className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${balanceTarget?.type === 'topup' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {balanceMutation.isPending ? 'Đang xử lý...' : balanceTarget?.type === 'topup' ? 'Nạp' : 'Trừ'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        loading={deleteMutation.isPending}
        title="Xóa người dùng"
        message={`Bạn có chắc muốn xóa người dùng "${deleting?.username}"?`}
        confirmLabel="Xóa"
      />
    </div>
  )
}
