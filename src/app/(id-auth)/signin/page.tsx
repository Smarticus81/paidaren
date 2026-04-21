import { Suspense } from "react";
import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Suspense fallback={<div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center text-sm text-slate-500">Loading…</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
