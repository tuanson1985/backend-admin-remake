import { createFileRoute, Outlet, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import { useUiStore } from '@/store/ui.store'
import { apiClient } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Store, ShoppingBag, Users, Shield, Key, Settings, Menu, LogOut, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_admin')({
  beforeLoad: () => {
    const token = useAuthStore.getState().accessToken
    if (!token) throw redirect({ to: '/login' })
  },
  component: AdminLayout,
})

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/shop-groups', label: 'Shop Groups', icon: Store },
  { to: '/shops', label: 'Shops', icon: ShoppingBag },
  { to: '/users', label: 'Người dùng', icon: Users },
  { to: '/roles', label: 'Roles', icon: Shield },
  { to: '/permissions', label: 'Permissions', icon: Key },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function AdminLayout() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me')
      return res.data.data
    },
    retry: false,
    enabled: !user,
  })

  const currentUser = user || meData

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout') } catch {}
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'bg-gray-900 text-white flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={16} />
          </div>
          {!sidebarCollapsed && <span className="font-semibold text-sm">Admin Panel</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors',
                '[&.active]:text-white [&.active]:bg-blue-600',
              )}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User */}
        {!sidebarCollapsed && currentUser && (
          <div className="px-4 py-4 border-t border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
                {currentUser.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm w-full"
            >
              <LogOut size={16} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-900">
            <Menu size={20} />
          </button>
          <ChevronRight size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">Admin</span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
