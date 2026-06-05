'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cloud, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('@Admin123');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() === 'admin@gmail.com' && password.trim() === '@Admin123') {
      // Set simple auth cookie valid for 7 days
      document.cookie = "klb_auth=true; path=/; max-age=" + (60 * 60 * 24 * 7);
      // Hard redirect to force Next.js middleware to pick up the new cookie
      window.location.href = '/dashboard';
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Cloud className="w-7 h-7 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Back</h2>
          <p className="text-slate-400 text-center mb-8">Sign in to manage your media</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200 placeholder-slate-500 transition-all"
                  placeholder="Email address"
                  required
                />
              </div>
            </div>
            
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-200 placeholder-slate-500 transition-all"
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all active:scale-[0.98]"
            >
              Sign In
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
