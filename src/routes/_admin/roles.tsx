import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_admin/roles')({
  component: () => (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Roles</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        Coming soon...
      </div>
    </div>
  ),
})
