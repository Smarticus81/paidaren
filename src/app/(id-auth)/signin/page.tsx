"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("resend", { email, callbackUrl: "/", redirect: false });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-4">
            SOCRATES
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Check your email</h1>
          <p className="text-slate-600">
            We sent a sign-in link to <strong>{email}</strong>. Click it to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-2">
          SOCRATES
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Instructional Designer Portal</h1>
        <p className="text-slate-600 mb-6">
          Sign in with your email to access the activity dashboard.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@institution.edu"
            className="w-full border-2 border-slate-300 rounded-lg px-4 py-3 text-base focus:border-slate-900 outline-none mb-4"
            required
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold disabled:opacity-40"
          >
            {loading ? "Sending link…" : "Send magic link"}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-4 text-center">
          Powered by Paidaren Intelligence Solutions
        </p>
      </div>
    </div>
  );
}
