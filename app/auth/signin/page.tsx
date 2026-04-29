"use client";

import { useState, Suspense } from 'react';
import "../../app/styles/cyber-global.css";
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/button';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const successMessage = searchParams.get('registered') === 'true'
    ? 'Account created successfully! Please sign in.'
    : searchParams.get('passwordChanged') === 'true'
      ? 'Password changed successfully! Please sign in with your new password.'
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        remember,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Redirect to levels page
      router.push('/levels/1');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[hsl(220,26%,6%)] flex items-center justify-center p-4">
      {/* Animated Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220,26%,10%)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220,26%,10%)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      {/* Glowing Orbs */}
      <motion.div
        className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Sign In Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-[hsl(220,26%,10%)]/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-bold mb-2 bg-linear-to-r from-cyan-400 via-green-400 to-purple-400 bg-clip-text text-transparent"
              >
              Sign In
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-cyan-300/70"
            >
              Access the CTF Challenge Platform
            </motion.p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm"
            >
              {successMessage}
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-cyan-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[hsl(220,26%,8%)] border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-cyan-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[hsl(220,26%,8%)] border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:opacity-50"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-2 text-xs text-cyan-300/80 hover:text-cyan-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-cyan-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded bg-[hsl(220,26%,8%)] border-cyan-500/30"
                />
                Remember me
              </label>
              <Link href="/auth/change-password" className="text-sm text-cyan-400/70 hover:text-cyan-300">Forgot password?</Link>
            </div>

            <Button
              type="submit"
              aria-label="Sign in"
              className="w-full py-3"
              disabled={isLoading || !email.includes('@') || password.length < 6}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-8 text-center">
            <p className="text-cyan-400/70 text-sm">
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/signup"
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </div>

          {/* Admin Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
          >
            <p className="text-purple-300 text-xs text-center">
              Admin accounts are provisioned by the server administrator and cannot be self-created.
            </p>
          </motion.div>
        </div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <Link
            href="/"
            className="text-cyan-400/70 hover:text-cyan-400 text-sm transition-colors"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[hsl(220,26%,6%)] flex items-center justify-center">
        <div className="text-cyan-400">Loading...</div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
