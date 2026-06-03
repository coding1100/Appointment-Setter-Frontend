import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { motion } from 'motion/react';

import { authAPI } from '../../services/api';

const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [loadingValidation, setLoadingValidation] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenReason, setTokenReason] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60';

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenReason('Missing reset token.');
        setLoadingValidation(false);
        return;
      }
      try {
        const response = await authAPI.validateResetPasswordToken(token);
        const valid = Boolean(response?.data?.valid);
        setIsValidToken(valid);
        if (!valid) {
          setTokenReason(response?.data?.reason || 'invalid_or_expired');
        }
      } catch (validationError) {
        setTokenReason(validationError?.response?.data?.detail || 'Unable to validate reset token.');
      } finally {
        setLoadingValidation(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await authAPI.resetPassword({ token, new_password: password });
      setSuccess(response?.data?.message || 'Password reset successfully. You can now sign in.');
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
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
            <h2 className="text-center text-3xl font-semibold text-gray-900">Choose new password</h2>
            <p className="mt-2 text-center text-sm text-gray-500">Set a fresh password for your account.</p>

            {loadingValidation ? (
              <p className="mt-6 text-sm text-slate-600">Validating token...</p>
            ) : null}

            {!loadingValidation && !isValidToken ? (
              <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Reset link is invalid or expired ({tokenReason}).
              </div>
            ) : null}

            {!loadingValidation && isValidToken ? (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
                {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={inputClass}
                    placeholder="New password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className={inputClass}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-xl bg-gray-900 text-base font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Reset password'}
                </button>
              </form>
            ) : null}

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

export default ResetPasswordForm;
