import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <SignUp routing="hash" />
    </div>
  );
}
