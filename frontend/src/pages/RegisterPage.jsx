import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiArrowRight, FiZap, FiCheck } from 'react-icons/fi'

const RegisterPage = () => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const user = {
        email,
        username,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }

      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('token', 'demo-token-' + Date.now())
      localStorage.setItem('isAuthenticated', 'true')

      setTimeout(() => {
        navigate('/dashboard')
      }, 300)
    } catch (err) {
      setError(err.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    'AI-powered financial insights',
    'Real-time Tally ERP sync',
    '20+ specialized dashboards',
    'Smart document analysis',
  ]

  return (
    <div className="min-h-screen bg-[#050505] flex relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-[#BF00FF]/10 rounded-full blur-[150px] animate-float" />
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] bg-[#00F5FF]/10 rounded-full blur-[150px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      </div>

      {/* Left Panel - Form */}
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
              <h2 className="text-2xl font-bold mb-2">Create Your Account</h2>
              <p className="text-white/50">Start your journey with AI-powered analytics</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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
                <label className="block text-sm font-medium text-white/70 mb-2">Username</label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="johndoe"
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
                    minLength={6}
                    className="input-neon pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Confirm Password</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account <FiArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-white/40 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-[#00F5FF] font-semibold hover:underline">
                  Sign In
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

      {/* Right Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative">
        <div className="max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#BF00FF] to-[#FF00E5] flex items-center justify-center shadow-2xl animate-pulse-glow">
                <FiZap className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-[#BF00FF] to-[#FF00E5] opacity-30 blur-xl -z-10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gradient-pink">TallyDash Pro</h1>
              <p className="text-white/40">AI-Powered Analytics</p>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-5xl font-black leading-tight mb-6">
            Join Thousands <br />
            of <span className="text-gradient-pink">Smart</span> <br />
            Businesses
          </h2>
          <p className="text-white/50 text-lg mb-12 leading-relaxed">
            Create your free account and unlock the full power of AI-driven financial analytics 
            for your Tally ERP data.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-4 text-white/70">
                <div className="w-8 h-8 rounded-lg bg-[#00FF88]/20 flex items-center justify-center">
                  <FiCheck className="w-4 h-4 text-[#00FF88]" />
                </div>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
