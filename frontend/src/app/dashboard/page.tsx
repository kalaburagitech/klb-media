'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatBytes, cn } from '@/lib/utils';
import { 
  FileText, 
  HardDrive, 
  Activity, 
  Key, 
  Copy, 
  CheckCircle2 
} from 'lucide-react';

export default function DashboardOverview() {
  const [stats, setStats] = useState({ total_files: 0, total_size: 0 });
  const [user, setUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, userRes] = await Promise.all([
          api.get('/media/stats'),
          api.get('/auth/me')
        ]);
        setStats(statsRes.data);
        setUser(userRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  const copyApiKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cards = [
    {
      name: 'Total Files',
      value: stats.total_files,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10'
    },
    {
      name: 'Storage Used',
      value: formatBytes(parseInt(stats.total_size as any) || 0),
      icon: HardDrive,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10'
    },
    {
      name: 'Monthly Bandwidth',
      value: 'Coming Soon',
      icon: Activity,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-slate-400 text-lg">Welcome back to your media dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.name} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm hover:border-slate-700 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl", card.bg)}>
                <card.icon className={cn("w-6 h-6", card.color)} />
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium">{card.name}</p>
            <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold mb-1">
              <Key className="w-4 h-4" />
              <span>API Credentials</span>
            </div>
            <h2 className="text-xl font-bold">Your API Key</h2>
            <p className="text-slate-400 max-w-md">Use this key to upload files programmatically via our API endpoints.</p>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl min-w-[300px]">
            <code className="flex-1 px-2 text-sm text-slate-300 font-mono truncate">
              {user?.api_key || '••••••••••••••••••••••••'}
            </code>
            <button 
              onClick={copyApiKey}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
