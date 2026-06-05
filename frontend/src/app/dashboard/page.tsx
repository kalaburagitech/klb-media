'use client';

import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatBytes, cn } from '@/lib/utils';
import { 
  FileText, 
  HardDrive, 
  Activity, 
  User
} from 'lucide-react';

export default function DashboardOverview() {
  const displayEmail = "admin@gmail.com";
  const stats = useQuery(api.media.getStats);

  const cards = [
    {
      name: 'Total Files',
      value: stats ? stats.totalFiles : '...',
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10'
    },
    {
      name: 'Storage Used',
      value: stats ? formatBytes(stats.totalSize) : '...',
      icon: HardDrive,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10'
    },
    {
      name: 'Plan',
      value: 'Free Tier',
      icon: Activity,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-slate-400 text-lg">Welcome back to your Convex-powered media dashboard.</p>
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
              <User className="w-4 h-4" />
              <span>User Information</span>
            </div>
            <h2 className="text-xl font-bold">Profile Details</h2>
            <p className="text-slate-400 max-w-md">Your account is managed securely via Clerk.</p>
          </div>
          
          <div className="flex items-center gap-2 p-4 bg-slate-950 border border-slate-800 rounded-xl min-w-[300px]">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase">Email</span>
              <span className="text-sm text-slate-300 font-medium">
                {displayEmail}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
