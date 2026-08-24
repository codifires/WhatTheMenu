import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { publicAPI } from './services/api'
import Maintenance from './pages/Maintenance'

// Layouts (Keep these synchronous to prevent layout shift)
import AdminLayout from './layouts/AdminLayout'
import OwnerLayout from './layouts/OwnerLayout'
import CustomerLayout from './layouts/CustomerLayout'
import ProtectedRoute from './components/ProtectedRoute'

// Auth Pages (Synchronous for fast load since they are entry points)
import AdminLogin from './pages/auth/AdminLogin'
import OwnerLogin from './pages/auth/OwnerLogin'
import OwnerRegister from './pages/auth/OwnerRegister'
import SetPassword from './pages/auth/SetPassword'
import ForgotPassword from './pages/auth/ForgotPassword'
import LandingPage from './pages/LandingPage'
import TermsAndConditions from './pages/TermsAndConditions'
import PrivacyPolicy from './pages/PrivacyPolicy'
import RefundPolicy from './pages/RefundPolicy'


// Lazy loaded Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const CafeManagement = lazy(() => import('./pages/admin/CafeManagement'))
const SubscriptionManagement = lazy(() => import('./pages/admin/SubscriptionManagement'))
const RevenueManagement = lazy(() => import('./pages/admin/RevenueManagement'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminMediaLibrary = lazy(() => import('./pages/admin/AdminMediaLibrary'))
const PlanServicesManagement = lazy(() => import('./pages/admin/PlanServicesManagement'))
const SupportTicketManagement = lazy(() => import('./pages/admin/SupportTicketManagement'))

// Lazy loaded Owner Pages
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'))
const OrderManagement = lazy(() => import('./pages/owner/OrderManagement'))
const CompletedOrders = lazy(() => import('./pages/owner/CompletedOrders'))
const PaymentManagement = lazy(() => import('./pages/owner/PaymentManagement'))
const OwnerRevenueManagement = lazy(() => import('./pages/owner/RevenueManagement'))
const MenuManagement = lazy(() => import('./pages/owner/MenuManagement'))
const CategoryManagement = lazy(() => import('./pages/owner/CategoryManagement'))
const QRCodePage = lazy(() => import('./pages/owner/QRCodePage'))
const FeedbackPage = lazy(() => import('./pages/owner/FeedbackPage'))
const OwnerSettings = lazy(() => import('./pages/owner/OwnerSettings'))
const OwnerSubscription = lazy(() => import('./pages/owner/OwnerSubscription'))
const OwnerSupport = lazy(() => import('./pages/owner/OwnerSupport'))

// Lazy loaded Customer Pages (CRITICAL for fast QR loads)
const CustomerMenu = lazy(() => import('./pages/customer/CustomerMenu'))
const CustomerSearch = lazy(() => import('./pages/customer/CustomerSearch'))
const Cart = lazy(() => import('./pages/customer/Cart'))
const Checkout = lazy(() => import('./pages/customer/Checkout'))
const OrderTracking = lazy(() => import('./pages/customer/OrderTracking'))
const CustomerFeedback = lazy(() => import('./pages/customer/CustomerFeedback'))

// Loading Fallback Component
const PageLoader = () => (
  <div className="min-h-screen bg-dark-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center animate-pulse-glow">
        <span className="text-white text-xl font-bold font-display">WTM</span>
      </div>
      <div className="flex items-center gap-2 text-dark-400">
        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  </div>
)

function App() {
  const { user, loading } = useAuth()
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    publicAPI.getSettings()
      .then(res => {
        setMaintenanceMode(res.data.data.maintenance_mode || false)
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [])

  useEffect(() => {
    if (!settingsLoading && !loading) {
      const isSuperadmin = user?.role === 'superadmin'
      const isMaintenancePath = location.pathname === '/maintenance'
      const isAdminLogin = location.pathname === '/admin/login'

      if (maintenanceMode && !isSuperadmin && !isAdminLogin && !isMaintenancePath) {
        navigate('/maintenance', { replace: true })
      }
      
      if (!maintenanceMode && isMaintenancePath) {
        navigate('/', { replace: true })
      }
    }
  }, [maintenanceMode, settingsLoading, loading, user, location.pathname, navigate])

  if (loading || settingsLoading) return <PageLoader />

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Maintenance Route */}
        <Route path="/maintenance" element={<Maintenance />} />

        {/* Auth Routes — separate portals */}
        <Route path="/set-password/:token" element={<SetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/login" element={
          user?.role === 'superadmin' ? <Navigate to="/admin" /> : <AdminLogin />
        } />
        <Route path="/owner/login" element={
          user?.role === 'owner' ? <Navigate to="/owner" /> : <OwnerLogin />
        } />
        <Route path="/owner/register" element={
          user?.role === 'owner' ? <Navigate to="/owner" /> : <OwnerRegister />
        } />
        {/* Legacy /login redirect */}
        <Route path="/login" element={<Navigate to="/owner/login" replace />} />

        {/* Super Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><AdminDashboard /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/cafes" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><CafeManagement /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/subscriptions" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><SubscriptionManagement /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/revenue" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><RevenueManagement /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/payments" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><AdminPayments /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/logs" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><AdminLogs /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><AdminSettings /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/services" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><PlanServicesManagement /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/media" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><AdminMediaLibrary /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/support" element={
          <ProtectedRoute role="superadmin">
            <AdminLayout><SupportTicketManagement /></AdminLayout>
          </ProtectedRoute>
        } />

        {/* Café Owner Routes */}
        <Route path="/owner" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><OwnerDashboard /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/orders" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><OrderManagement /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/completed-orders" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><CompletedOrders /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/payments" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><PaymentManagement /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/revenue" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><OwnerRevenueManagement /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/menu" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><MenuManagement /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/categories" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><CategoryManagement /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/qr-code" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><QRCodePage /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/feedback" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><FeedbackPage /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/settings" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><OwnerSettings /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/subscription" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><OwnerSubscription /></OwnerLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/support" element={
          <ProtectedRoute role="owner">
            <OwnerLayout><OwnerSupport /></OwnerLayout>
          </ProtectedRoute>
        } />

        {/* Customer Routes (Public - No Auth) */}
        <Route path="/menu/:cafeId" element={
          <CustomerLayout><CustomerMenu /></CustomerLayout>
        } />
        <Route path="/menu/:cafeId/search" element={
          <CustomerLayout><CustomerSearch /></CustomerLayout>
        } />
        <Route path="/menu/:cafeId/cart" element={
          <CustomerLayout><Cart /></CustomerLayout>
        } />
        <Route path="/menu/:cafeId/checkout" element={
          <CustomerLayout><Checkout /></CustomerLayout>
        } />
        <Route path="/menu/:cafeId/orders" element={
          <CustomerLayout><OrderTracking /></CustomerLayout>
        } />
        <Route path="/menu/:cafeId/feedback" element={
          <CustomerLayout><CustomerFeedback /></CustomerLayout>
        } />

        {/* Default route */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="*" element={
          <div className="min-h-screen bg-dark-950 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold font-display text-primary-500 mb-4">404</h1>
              <p className="text-dark-400 mb-6">Page not found</p>
              <a href="/login" className="btn btn-primary">Go to Login</a>
            </div>
          </div>
        } />
      </Routes>
    </Suspense>
  )
}

export default App
