import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { FiMail, FiLock, FiArrowRight, FiZap, FiCpu, FiDatabase } from 'react-icons/fi'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const storedUser = localStorage.getItem('user')
      
      if (storedUser) {
        const user = JSON.parse(storedUser)
        const token = 'demo-token-' + Date.now()
        login(user, token)
        localStorage.setItem('token', token)
        localStorage.setItem('isAuthenticated', 'true')
        navigate('/dashboard')
      } else {
        const user = {
          email,
          username: email.split('@')[0],
          id: Date.now().toString(),
          createdAt: new Date().toISOString()
        }
        const token = 'demo-token-' + Date.now()
        login(user, token)
        localStorage.setItem('user', JSON.stringify(user))
        localStorage.setItem('token', token)
        localStorage.setItem('isAuthenticated', 'true')
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: FiCpu, text: 'AI-Powered Analytics with Phi4:14b' },
    { icon: FiDatabase, text: 'Real-time Tally ERP Integration' },
    { icon: FiZap, text: '20+ Specialized Dashboards' },
  ]

  return (
    <div className="min-h-screen bg-[#050505] flex relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-[#00F5FF]/10 rounded-full blur-[150px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#BF00FF]/10 rounded-full blur-[150px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-[#FF00E5]/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative">
        <div className="max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] flex items-center justify-center shadow-2xl animate-pulse-glow">
                <FiZap className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] opacity-30 blur-xl -z-10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gradient">TallyDash Pro</h1>
              <p className="text-white/40">AI-Powered Analytics</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-5xl font-black leading-tight mb-6">
            Transform Your <br />
            <span className="text-gradient">Financial Data</span> <br />
            Into Insights
          </h2>
          <p className="text-white/50 text-lg mb-12 leading-relaxed">
            Harness the power of AI to analyze your Tally ERP data. Get instant insights, 
            forecasts, and actionable intelligence at your fingertips.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4 text-white/70">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-[#00F5FF]" />
                </div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00F5FF] to-[#BF00FF] flex items-center justify-center">
              <FiZap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gradient">TallyDash Pro</h1>
          </div>

          {/* Form Card */}
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-white/50">Sign in to access your dashboard</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="input-neon pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="input-neon pl-12"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-neon w-full flex items-center justify-center gap-2 py-4 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In <FiArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-white/40 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-[#00F5FF] font-semibold hover:underline">
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-white/30 text-xs mt-8">
            © 2024 TallyDash Pro. AI-Powered Financial Analytics.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
