'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  User, 
  Key, 
  Mail, 
  Shield, 
  Copy, 
  CheckCircle2,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const copyApiKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
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
        <p className="text-slate-400 text-lg">Manage your account and API credentials.</p>
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
                  {user?.email}
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
          </div>
        </div>

        {/* API Credentials Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Key className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold">API Credentials</h2>
          </div>
          <div className="p-8 space-y-6">
            <p className="text-slate-400">Use this API key to authenticate requests from your own applications.</p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Your Secret API Key</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-300 truncate">
                  {user?.api_key}
                </div>
                <button 
                  onClick={copyApiKey}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-slate-400 hover:text-white"
                  title="Copy API Key"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-4">
              <Shield className="w-6 h-6 text-amber-500 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-500">Security Warning</h4>
                <p className="text-xs text-slate-400">Keep your API key secret. Never share it in client-side code or public repositories.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
