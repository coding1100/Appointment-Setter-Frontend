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
    'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="px-8 py-6 flex items-center">
        <h1 className="text-2xl font-semibold tracking-wide text-gray-900">MindRind</h1>
      </div>
      <div className="flex flex-1 items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          <div className="rounded-3xl border border-gray-100 bg-white shadow-2xl p-10">
            <h2 className="text-center text-3xl font-semibold text-gray-900">Reset password</h2>
            <p className="mt-2 text-center text-sm text-gray-500">We will email you a reset link.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
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
                className="h-12 w-full rounded-xl bg-gray-900 text-base font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-500">
              Back to{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:underline">
                sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
