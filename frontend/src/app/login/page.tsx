"use client";

import { SignIn } from "@clerk/nextjs";
import { Cloud } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Cloud className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">KLB Media</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in securely to manage production media.</p>
          </div>
        </div>
        <SignIn routing="hash" forceRedirectUrl="/dashboard" />
      </section>
    </main>
  );
}
