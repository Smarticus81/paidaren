"use client";
import { useActionState } from "react";
import { inviteUser, type InviteResult } from "../actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteResult | null, FormData>(
    inviteUser,
    null,
  );

  return (
    <form action={formAction} className="bg-surface border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label
            htmlFor="invite-email"
            className="block text-[10px] uppercase tracking-wider font-medium text-muted mb-1"
          >
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="newadmin@example.com"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="invite-role"
            className="block text-[10px] uppercase tracking-wider font-medium text-muted mb-1"
          >
            Role
          </label>
          <select
            id="invite-role"
            name="role"
            defaultValue="ADMIN"
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="ADMIN">Admin</option>
            <option value="INSTRUCTIONAL_DESIGNER">Designer</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "Granting…" : "Grant access"}
        </button>
      </div>

      {state?.ok && (
        <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {state.created
            ? `Created ${state.email} as ${roleLabel(state.role)}. They can now sign in via magic link.`
            : `Granted ${roleLabel(state.role)} to ${state.email}.`}
        </p>
      )}
      {state && !state.ok && (
        <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Pre-creates the user with the chosen role. They&apos;ll get access immediately when they sign in
        with this email.
      </p>
    </form>
  );
}

function roleLabel(role: "ADMIN" | "INSTRUCTIONAL_DESIGNER"): string {
  return role === "ADMIN" ? "Admin" : "Designer";
}
