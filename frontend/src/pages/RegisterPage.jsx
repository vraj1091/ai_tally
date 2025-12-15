import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiZap, FiArrowRight, FiCheck, FiX, FiCheckCircle, FiAlertCircle, FiShield, FiAward, FiTrendingUp } from 'react-icons/fi'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' })
  const { register } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (touched[name]) {
      validateField(name, value)
    }
  }

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validateUsername = (username) => {
    return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username)
  }

  const calculatePasswordStrength = (password) => {
    let score = 0
    if (!password) return { score: 0, label: '', color: '#E5E7EB' }
    
    // Length
    if (password.length >= 8) score += 25
    if (password.length >= 12) score += 25
    
    // Complexity
    if (/[a-z]/.test(password)) score += 10
    if (/[A-Z]/.test(password)) score += 15
    if (/[0-9]/.test(password)) score += 15
    if (/[^a-zA-Z0-9]/.test(password)) score += 20
    
    let label = ''
    let color = ''
    
    if (score < 40) {
      label = 'Weak'
      color = '#EF4444'
    } else if (score < 60) {
      label = 'Fair'
      color = '#F59E0B'
    } else if (score < 80) {
      label = 'Good'
      color = '#3B82F6'
    } else {
      label = 'Strong'
      color = '#10B981'
    }
    
    return { score, label, color }
  }

  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password))
    }
  }, [formData.password])

  const validateField = (field, value) => {
    const newErrors = { ...errors }
    
    switch (field) {
      case 'username':
        if (!value) {
          newErrors.username = 'Username is required'
        } else if (!validateUsername(value)) {
          newErrors.username = '3-20 characters, letters, numbers, underscore only'
        } else {
          delete newErrors.username
        }
        break
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required'
        } else if (!validateEmail(value)) {
          newErrors.email = 'Please enter a valid email address'
        } else {
          delete newErrors.email
        }
        break
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required'
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters'
        } else {
          delete newErrors.password
        }
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match'
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword
        }
        break
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password'
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match'
        } else {
          delete newErrors.confirmPassword
        }
        break
      default:
        break
    }
    
    setErrors(newErrors)
  }

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true })
    validateField(field, formData[field])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all fields
    Object.keys(formData).forEach(field => validateField(field, formData[field]))
    
    if (!agreeToTerms) {
      toast.error('Please accept the terms and conditions')
      return
    }
    
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix all errors before submitting')
      return
    }
    
    setLoading(true)
    try {
      await register(formData.username, formData.email, formData.password)
      toast.success('🎉 Account created successfully!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message || '❌ Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const passwordRequirements = [
    { test: (p) => p.length >= 8, label: 'At least 8 characters' },
    { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
    { test: (p) => /[a-z]/.test(p), label: 'One lowercase letter' },
    { test: (p) => /[0-9]/.test(p), label: 'One number' },
    { test: (p) => /[^a-zA-Z0-9]/.test(p), label: 'One special character' }
  ]

  const features = [
    { icon: FiShield, title: 'Enterprise Security', desc: 'Bank-level encryption' },
    { icon: FiAward, title: 'Premium Features', desc: '20+ dashboards included' },
    { icon: FiTrendingUp, title: 'Real-time Analytics', desc: 'Live data insights' }
  ]

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-20 animate-pulse" style={{ background: 'var(--primary)', filter: 'blur(80px)', animationDuration: '5s' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 animate-pulse" style={{ background: 'var(--teal)', filter: 'blur(100px)', animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full opacity-10 animate-pulse" style={{ background: 'var(--blue)', filter: 'blur(90px)', animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-y-auto">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <FiZap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>TallyDash Pro</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enterprise Analytics</p>
            </div>
          </div>

          <div className="card p-8 shadow-2xl" style={{ border: '1px solid var(--border-color)' }}>
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Create your account 🚀</h2>
              <p style={{ color: 'var(--text-muted)' }}>Start your 30-day free trial today</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                  Username
                </label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    onBlur={() => handleBlur('username')}
                    placeholder="johndoe"
                    className="input-neon pl-12 pr-12"
                    style={{ 
                      borderColor: touched.username ? (errors.username ? '#EF4444' : formData.username ? '#10B981' : 'var(--border-color)') : 'var(--border-color)'
                    }}
                    required
                  />
                  {touched.username && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {errors.username ? (
                        <FiAlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
                      ) : formData.username ? (
                        <FiCheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                      ) : null}
                    </div>
                  )}
                </div>
                {touched.username && errors.username && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#EF4444' }}>
                    <FiAlertCircle className="w-3 h-3" />
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    placeholder="you@company.com"
                    className="input-neon pl-12 pr-12"
                    style={{ 
                      borderColor: touched.email ? (errors.email ? '#EF4444' : formData.email ? '#10B981' : 'var(--border-color)') : 'var(--border-color)'
                    }}
                    required
                  />
                  {touched.email && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {errors.email ? (
                        <FiAlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
                      ) : formData.email ? (
                        <FiCheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                      ) : null}
                    </div>
                  )}
                </div>
                {touched.email && errors.email && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#EF4444' }}>
                    <FiAlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    placeholder="••••••••••"
                    className="input-neon pl-12 pr-12"
                    style={{ 
                      borderColor: touched.password ? (errors.password ? '#EF4444' : formData.password && passwordStrength.score >= 60 ? '#10B981' : 'var(--border-color)') : 'var(--border-color)'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Password Strength
                      </span>
                      <span className="text-xs font-semibold" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${passwordStrength.score}%`,
                          background: passwordStrength.color
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Password Requirements */}
                {formData.password && (
                  <div className="mt-3 space-y-1">
                    {passwordRequirements.map((req, i) => {
                      const passed = req.test(formData.password)
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs" style={{ color: passed ? '#10B981' : 'var(--text-muted)' }}>
                          {passed ? <FiCheck className="w-3 h-3" /> : <FiX className="w-3 h-3" />}
                          {req.label}
                        </div>
                      )
                    })}
                  </div>
                )}

                {touched.password && errors.password && (
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#EF4444' }}>
                    <FiAlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    placeholder="••••••••••"
                    className="input-neon pl-12 pr-12"
                    style={{ 
                      borderColor: touched.confirmPassword ? (errors.confirmPassword ? '#EF4444' : formData.confirmPassword && formData.confirmPassword === formData.password ? '#10B981' : 'var(--border-color)') : 'var(--border-color)'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#EF4444' }}>
                    <FiAlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
                {touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword && (
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#10B981' }}>
                    <FiCheckCircle className="w-3 h-3" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer mt-0.5" 
                    style={{ accentColor: 'var(--primary)' }} 
                  />
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    I agree to the{' '}
                    <Link to="/terms" className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading || Object.keys(errors).length > 0 || !agreeToTerms} 
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-lg font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{
                  background: (loading || Object.keys(errors).length > 0 || !agreeToTerms) ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: (loading || Object.keys(errors).length > 0 || !agreeToTerms) ? 'none' : '0 10px 40px rgba(139, 92, 246, 0.4)',
                  cursor: (loading || Object.keys(errors).length > 0 || !agreeToTerms) ? 'not-allowed' : 'pointer',
                  opacity: (loading || Object.keys(errors).length > 0 || !agreeToTerms) ? 0.6 : 1
                }}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <FiArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
            </div>

            {/* Social Login Placeholder */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="btn-ghost py-3 flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button className="btn-ghost py-3 flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>

            {/* Sign In Link */}
            <p className="text-center" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-semibold hover:underline transition-all"
                style={{ color: 'var(--primary)' }}
              >
                Sign in →
              </Link>
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-1">
              <FiCheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              Free 30-day trial
            </div>
            <div className="flex items-center gap-1">
              <FiCheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              No credit card
            </div>
            <div className="flex items-center gap-1">
              <FiCheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              Cancel anytime
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 right-20 w-64 h-64 rounded-full" style={{ background: 'white', filter: 'blur(100px)' }} />
            <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full" style={{ background: 'white', filter: 'blur(120px)' }} />
          </div>
        </div>
        
        <div className="relative z-10 text-white max-w-lg animate-fade-up" style={{ animationDelay: '0.2s' }}>
          {/* Logo */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce" style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)' }}>
              <FiZap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome to TallyDash</h1>
              <p className="text-sm opacity-80">Start your journey today</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Everything You Need to Transform Your Business Analytics
          </h2>
          <p className="text-lg opacity-90 mb-12">
            Join thousands of businesses using TallyDash to make data-driven decisions and boost profitability.
          </p>
          
          {/* Features */}
          <div className="space-y-4 mb-12">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="p-5 rounded-xl hover:scale-105 transition-all duration-300"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                    <p className="text-sm opacity-80">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="p-6 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.3)' }} />
              <div>
                <div className="font-semibold">Sarah Johnson</div>
                <div className="text-sm opacity-80">CFO, Tech Corp</div>
              </div>
            </div>
            <p className="text-sm opacity-90 italic">
              "TallyDash transformed how we analyze our financial data. The AI insights are incredibly accurate and have helped us identify cost-saving opportunities worth $500K+"
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
