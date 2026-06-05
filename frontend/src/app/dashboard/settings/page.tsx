'use client';

import React from 'react';
import { useUser } from "@clerk/nextjs";
import { 
  User, 
  Mail, 
  Shield, 
  Loader2
} from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const mockUser = { primaryEmailAddress: { emailAddress: "rahulbalbatti032@gmail.com" } };
  const displayUser = user || (process.env.NODE_ENV === 'development' ? mockUser : null);

  if (!isLoaded && process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-400 text-lg">Manage your account information.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Profile Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold">Profile Information</h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email Address
                </label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200">
                  {displayUser?.primaryEmailAddress?.emailAddress || 'Loading...'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Account Status
                </label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  Active
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Account management is securely handled by Clerk. 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
