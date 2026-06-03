import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';

import { useAuth } from '../../contexts/AuthContext';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember_me: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const inputClass =
    'h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-11 text-sm text-[#1a1a2e] outline-none transition placeholder:text-slate-400 focus:border-[#006b5c] focus:bg-white focus:ring-4 focus:ring-[#006b5c]/10';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData);

    if (result.success) {
      navigate('/apps');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — mirrors dashboard sidebar */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-[#1a1a2e] p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#68fadd]/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-24 h-56 w-56 rounded-full bg-[#006b5c]/20 blur-3xl"
        />

        <div className="relative">
          <h1 className="text-2xl font-semibold tracking-wide text-[#68fadd]">AiToolsSuite</h1>
          <div className="mt-3 h-0.5 w-10 rounded-full bg-[#68fadd]/60" />
        </div>

        <div className="relative space-y-4">
          <p className="max-w-xs text-3xl font-semibold leading-snug text-white">
            Voice AI workspace for modern teams
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-white/50">
            Configure agents, manage integrations, and deploy voice experiences from one admin console.
          </p>
        </div>

        <p className="relative text-xs tracking-widest text-white/30 uppercase">
          Agentic Admin
        </p>
      </div>

      {/* Form panel — mirrors dashboard main content area */}
      <div className="flex flex-1 flex-col bg-[#eef0f4]">
        <div className="bg-[#1a1a2e] px-8 py-5 lg:hidden">
          <h1 className="text-xl font-semibold tracking-wide text-[#68fadd]">AiToolsSuite</h1>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-md"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(26,26,46,0.08)]">
              <div className="h-1 bg-gradient-to-r from-[#006b5c] via-[#68fadd] to-[#006b5c]" />

              <div className="p-8 sm:p-10">
                <h2 className="text-center text-2xl font-semibold text-[#1a1a2e]">Welcome back</h2>
                <p className="mt-2 text-center text-sm text-slate-500">Sign in to your workspace</p>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className={inputClass}
                      placeholder="Email address"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className={inputClass}
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#006b5c]"
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label htmlFor="remember_me" className="flex items-center gap-2 text-slate-600">
                      <input
                        id="remember_me"
                        name="remember_me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 accent-[#006b5c] focus:ring-[#006b5c]/30"
                        checked={formData.remember_me}
                        onChange={handleChange}
                      />
                      Remember me
                    </label>
                    <Link
                      to="/forgot-password"
                      className="font-medium text-[#006b5c] transition hover:text-[#005548]"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-xl bg-[#006b5c] text-base font-medium text-white transition hover:bg-[#005548] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68fadd] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-[#006b5c] transition hover:text-[#005548]"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
