import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleEmailChange = (e) => {
    const val = e.target.value
    setEmail(val)
    if (!val) return setEmailError('')
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(val)) setEmailError('Invalid email address format')
    else setEmailError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }
    if (emailError) {
      toast.error(emailError)
      return
    }
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name}!`)
      if (user.role === 'superadmin') {
        navigate('/admin')
      } else {
        navigate('/owner')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 gradient-mesh flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-700/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 animate-pulse-glow">
            <span className="text-white text-2xl font-bold font-display">Q</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-white mb-2">QR Menu</h1>
          <p className="text-dark-400 text-sm">Sign in to your dashboard</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label" htmlFor="email">Email Address</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  className={`input pl-11 ${emailError ? 'border-red-500/50 focus:border-red-500' : ''}`}
                  placeholder="admin@qrmenu.com"
                  value={email}
                  onChange={handleEmailChange}
                  autoComplete="email"
                />
              </div>
              {emailError && <span className="text-red-500 text-xs mt-1 block">{emailError}</span>}
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-11 pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-primary-500/10">
            <p className="text-dark-500 text-xs text-center mb-3">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setEmail('admin@qrmenu.com'); setPassword('admin123'); }}
                className="btn btn-ghost btn-sm text-xs justify-center border border-primary-500/10"
              >
                Super Admin
              </button>
              <button
                onClick={() => { setEmail('cafe@demo.com'); setPassword('cafe123'); }}
                className="btn btn-ghost btn-sm text-xs justify-center border border-primary-500/10"
              >
                Café Owner
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-dark-600 text-xs mt-6">
          © 2024 QR Menu SaaS Platform
        </p>
      </div>
    </div>
  )
}

export default Login
