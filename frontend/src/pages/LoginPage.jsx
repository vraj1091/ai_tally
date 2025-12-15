import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiZap, FiArrowRight } from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden" style={{ background: 'var(--gradient-dark)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full" style={{ background: 'var(--primary)', filter: 'blur(100px)' }} />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full" style={{ background: 'var(--blue)', filter: 'blur(120px)' }} />
        </div>
        
        <div className="relative z-10 text-center text-white max-w-md">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <FiZap className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold mb-4">TallyDash Pro</h1>
          <p className="text-lg opacity-80 mb-8">Enterprise Analytics & AI-Powered Insights for Your Business</p>
          
          <div className="space-y-4 text-left">
            {['20+ Specialized Dashboards', 'AI-Powered Analysis', 'Real-time Tally Integration', 'Multi-Company Support'].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm opacity-90">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <FiArrowRight className="w-3 h-3" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <FiZap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>TallyDash</h1>
          </div>

          <div className="card p-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome back</h2>
            <p className="mb-6" style={{ color: 'var(--text-muted)' }}>Sign in to continue to your dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-neon pl-12"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-neon pl-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: 'var(--primary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Forgot password?</Link>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign In <FiArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center mt-6" style={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-medium" style={{ color: 'var(--primary)' }}>Create account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

