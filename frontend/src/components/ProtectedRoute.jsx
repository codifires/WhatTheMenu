import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    const redirectTo = role === 'superadmin' ? '/admin/login' : '/owner/login'
    return <Navigate to={redirectTo} replace />
  }

  if (role && user.role !== role) {
    const redirectTo = role === 'superadmin' ? '/admin/login' : '/owner/login'
    return <Navigate to={redirectTo} replace />
  }

  return children
}

export default ProtectedRoute
