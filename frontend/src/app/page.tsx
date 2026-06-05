'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Middleware handles auth redirect logic now,
    // so just default to dashboard
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}
