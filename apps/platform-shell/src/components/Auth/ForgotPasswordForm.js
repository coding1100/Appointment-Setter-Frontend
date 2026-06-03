import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { motion } from 'motion/react';

import { authAPI } from '../../services/api';

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm text-[#1a1a2e] outline-none transition placeholder:text-slate-400 focus:border-[#006b5c] focus:bg-white focus:ring-4 focus:ring-[#006b5c]/10';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await authAPI.forgotPassword({ email: email.trim() });
      setSuccess(response?.data?.message || 'If your email exists, a reset link has been sent.');
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
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
            Recover access to your workspace
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-white/50">
            Enter the email linked to your account and we&apos;ll send you a secure link to reset your password.
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
                <h2 className="text-center text-2xl font-semibold text-[#1a1a2e]">Reset password</h2>
                <p className="mt-2 text-center text-sm text-slate-500">
                  We&apos;ll email you a reset link
                </p>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                  {error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  ) : null}
                  {success ? (
                    <div className="rounded-xl border border-[#006b5c]/20 bg-[#006b5c]/5 px-4 py-3 text-sm text-[#006b5c]">
                      {success}
                    </div>
                  ) : null}

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className={inputClass}
                      placeholder="Email address"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-xl bg-[#006b5c] text-base font-medium text-white transition hover:bg-[#005548] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68fadd] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                  Back to{' '}
                  <Link
                    to="/login"
                    className="font-medium text-[#006b5c] transition hover:text-[#005548]"
                  >
                    sign in
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

export default ForgotPasswordForm;
