"use client";

import { useState } from 'react';
import "../../styles/cyber-global.css";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/button';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setIsLoading(false);
        return;
      }

      // Redirect to sign in page after successful registration
      router.push('/auth/signin?registered=true');
    } catch (err) {
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
        className="absolute top-1/4 -left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"
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
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
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

      {/* Sign Up Form */}
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
              className="text-4xl font-bold mb-2 bg-linear-to-r from-green-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent"
            >
              Sign Up
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-cyan-300/70"
            >
              Create your account and start hacking
            </motion.p>
          </div>

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
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="w-full px-4 py-3 bg-[hsl(220,26%,8%)] border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-cyan-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[hsl(220,26%,8%)] border border-cyan-500/30 rounded-lg text-cyan-100 placeholder-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="Re-enter your password"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-cyan-300">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded bg-[hsl(220,26%,8%)] border-cyan-500/30"
                />
                Show password while typing
              </label>
              <Button
                type="submit"
                className="w-full py-3"
                disabled={isLoading || password.length < 6 || !email.includes('@') || password !== confirmPassword}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8 text-center">
            <p className="text-cyan-400/70 text-sm">
              Already have an account?{' '}
              <Link
                href="/auth/signin"
                className="text-green-400 hover:text-green-300 font-semibold underline underline-offset-4 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
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
