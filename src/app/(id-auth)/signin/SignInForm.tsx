"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export function SignInForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(params.get("sent") === "1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("error");
    if (!code) return;
    setError(messageForError(code));
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("resend", {
        email,
        callbackUrl: "/",
        redirect: false,
      });
      if (result?.error) {
        setError(messageForError(result.error));
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send magic link.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
        <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-4">
          SOCRATES
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Check your email</h1>
        <p className="text-slate-600 mb-2">
          We sent a sign-in link {email && <>to <strong>{email}</strong></>}. Click it to continue.
        </p>
        <p className="text-xs text-slate-500 mt-4">
          Don&apos;t see it? Check spam, or try again in a minute.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          className="text-xs text-slate-500 underline mt-4"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
      <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-2">
        SOCRATES
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Instructional Designer Portal</h1>
      <p className="text-slate-600 mb-6">
        Sign in with your email to access the activity dashboard.
      </p>
      {error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-4 py-3 mb-4"
        >
          {error}
        </div>
      )}
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
  );
}

function messageForError(code: string): string {
  switch (code) {
    case "EmailSignin":
      return "We couldn't send the magic link. The mail provider rejected the request — verify your sender domain in Resend, or contact support.";
    case "AccessDenied":
      return "This account has been disabled. Contact an administrator.";
    case "Verification":
      return "That sign-in link has expired or already been used. Request a new one below.";
    case "Configuration":
      return "Sign-in is misconfigured on the server. Contact support.";
    default:
      return code;
  }
}
