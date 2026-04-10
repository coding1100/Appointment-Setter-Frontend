import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { motion } from 'motion/react';

import { useAuth } from '../../contexts/AuthContext';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    role: 'admin',
    tenant_id: null,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const inputClass =
    'h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/60';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateUsername = (username) => {
    if (!username || username.trim().length === 0) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters long';
    if (username.length > 72) return 'Username must be no more than 72 characters long';
    return '';
  };

  const validatePassword = (password) => {
    if (!password || password.length === 0) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (password.length > 72) return 'Password must be no more than 72 characters long';
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!strongPasswordRegex.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';
    }
    return '';
  };

  const validateForm = () => {
    setFieldErrors({});
    let isValid = true;

    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setFieldErrors((prev) => ({ ...prev, username: usernameError }));
      isValid = false;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setFieldErrors((prev) => ({ ...prev, password: passwordError }));
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      isValid = false;
    }

    return isValid;
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    if (name === 'username') {
      setFieldErrors((prev) => ({ ...prev, username: validateUsername(value) }));
    } else if (name === 'password') {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    } else if (name === 'confirmPassword') {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: formData.password !== value ? 'Passwords do not match' : '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    const { confirmPassword, ...submitData } = formData;
    if (!submitData.tenant_id || submitData.tenant_id === '') {
      submitData.tenant_id = null;
    }

    const result = await register(submitData);

    if (result.success) {
      navigate('/login');
    } else if (result.statusCode === 400) {
      setError('This email is already registered. Please use a different email or sign in.');
    } else if (result.statusCode === 429) {
      setError('Too many registration attempts. Please wait a moment and try again.');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="px-8 py-6 flex items-center">
        <div className="flex items-center gap-3">
          <div className="leading-tight">
            <h1 className="text-2xl font-semibold tracking-wide text-gray-900">SAMAI REP</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-xl"
        >
          <div className="rounded-3xl border border-gray-100 bg-white shadow-2xl">
            <div className="p-10">
              <h2 className="text-center text-3xl font-semibold text-gray-900">Create account</h2>
              <p className="mt-2 text-center text-sm text-gray-500">Sign up to continue</p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      required
                      className={inputClass}
                      placeholder="First name"
                      value={formData.first_name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      required
                      className={inputClass}
                      placeholder="Last name"
                      value={formData.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
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
                  <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    minLength={3}
                    maxLength={72}
                    onBlur={handleBlur}
                    className={`${inputClass} ${fieldErrors.username ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-200/60' : ''}`}
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                  />
                  {fieldErrors.username ? (
                    <p className="mt-1 text-sm text-rose-600">{fieldErrors.username}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">3-72 characters</p>
                  )}
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={72}
                    onBlur={handleBlur}
                    className={`${inputClass} ${fieldErrors.password ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-200/60' : ''}`}
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                  {fieldErrors.password ? (
                    <p className="mt-1 text-sm text-rose-600">{fieldErrors.password}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      8-72 characters, including uppercase, lowercase, number, and special character.
                    </p>
                  )}
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    onBlur={handleBlur}
                    className={`${inputClass} ${fieldErrors.confirmPassword ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-200/60' : ''}`}
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                  {fieldErrors.confirmPassword && <p className="mt-1 text-sm text-rose-600">{fieldErrors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-gray-900 text-base font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-indigo-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterForm;
