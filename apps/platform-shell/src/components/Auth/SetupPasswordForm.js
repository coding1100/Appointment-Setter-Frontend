import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { motion } from 'motion/react';

import { authAPI } from '../../services/api';

const SetupPasswordForm = () => {
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
    'h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-11 text-sm text-[#1a1a2e] outline-none transition placeholder:text-slate-400 focus:border-[#006b5c] focus:bg-white focus:ring-4 focus:ring-[#006b5c]/10';

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenReason('Missing setup token.');
        setLoadingValidation(false);
        return;
      }
      try {
        const response = await authAPI.validateSetupPasswordToken(token);
        const valid = Boolean(response?.data?.valid);
        setIsValidToken(valid);
        if (!valid) {
          setTokenReason(response?.data?.reason || 'invalid_or_expired');
        }
      } catch (validationError) {
        setTokenReason(validationError?.response?.data?.detail || 'Unable to validate setup token.');
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
      const response = await authAPI.confirmSetupPassword({ token, new_password: password });
      setSuccess(response?.data?.message || 'Password set successfully. You can now sign in.');
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Failed to set password.');
    } finally {
      setSubmitting(false);
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
            Complete your account setup
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-white/50">
            Choose a secure password to activate your account and access the admin console.
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
                <h2 className="text-center text-2xl font-semibold text-[#1a1a2e]">Set your password</h2>
                <p className="mt-2 text-center text-sm text-slate-500">
                  Complete account setup to continue
                </p>

                {loadingValidation ? (
                  <p className="mt-6 text-center text-sm text-slate-500">Validating token...</p>
                ) : null}

                {!loadingValidation && !isValidToken ? (
                  <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    Setup link is invalid or expired ({tokenReason}).
                  </div>
                ) : null}

                {!loadingValidation && isValidToken ? (
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
                      <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
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

                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
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
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#006b5c]"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-12 w-full rounded-xl bg-[#006b5c] text-base font-medium text-white transition hover:bg-[#005548] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68fadd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Set password'}
                    </button>
                  </form>
                ) : null}

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

export default SetupPasswordForm;
