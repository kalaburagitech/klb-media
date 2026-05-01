import AuthForm from '@/components/auth/AuthForm';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
      <AuthForm type="signup" />
    </main>
  );
}
