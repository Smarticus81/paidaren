import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";

type SettingsShape = {
  platformName: string;
  supportEmail: string;
  defaultRigor: "INTRODUCTORY" | "STANDARD" | "RIGOROUS" | "EXAM_LEVEL";
  defaultTurnLimit: number;
  telemetryEnabled: boolean;
  signupsOpen: boolean;
};

const DEFAULTS: SettingsShape = {
  platformName: "Paidaren",
  supportEmail: "",
  defaultRigor: "STANDARD",
  defaultTurnLimit: 10,
  telemetryEnabled: true,
  signupsOpen: true,
};

async function loadSettings(): Promise<SettingsShape> {
  const rows = await prisma.adminSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value as unknown]));
  return {
    platformName: (map.get("platformName") as string) ?? DEFAULTS.platformName,
    supportEmail: (map.get("supportEmail") as string) ?? DEFAULTS.supportEmail,
    defaultRigor:
      (map.get("defaultRigor") as SettingsShape["defaultRigor"]) ?? DEFAULTS.defaultRigor,
    defaultTurnLimit:
      (map.get("defaultTurnLimit") as number) ?? DEFAULTS.defaultTurnLimit,
    telemetryEnabled:
      (map.get("telemetryEnabled") as boolean) ?? DEFAULTS.telemetryEnabled,
    signupsOpen: (map.get("signupsOpen") as boolean) ?? DEFAULTS.signupsOpen,
  };
}

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await loadSettings();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-1">Platform Settings</h1>
        <p className="text-muted text-sm">
          These values govern defaults, access, and observability for the whole platform.
        </p>
      </div>

      <form action={saveSettings} className="bg-surface border border-border rounded-2xl p-8 space-y-6">
        <Field label="Platform name" htmlFor="platformName" hint="Shown in the header and emails.">
          <input
            id="platformName"
            name="platformName"
            type="text"
            defaultValue={settings.platformName}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            required
          />
        </Field>

        <Field label="Support email" htmlFor="supportEmail" hint="Where users should send help requests.">
          <input
            id="supportEmail"
            name="supportEmail"
            type="email"
            defaultValue={settings.supportEmail}
            placeholder="support@example.edu"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Default rigor" htmlFor="defaultRigor" hint="New activities start here.">
            <select
              id="defaultRigor"
              name="defaultRigor"
              defaultValue={settings.defaultRigor}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="INTRODUCTORY">Introductory</option>
              <option value="STANDARD">Standard</option>
              <option value="RIGOROUS">Rigorous</option>
              <option value="EXAM_LEVEL">Exam level</option>
            </select>
          </Field>

          <Field label="Default turn limit" htmlFor="defaultTurnLimit" hint="6 – 20.">
            <input
              id="defaultTurnLimit"
              name="defaultTurnLimit"
              type="number"
              min={6}
              max={20}
              defaultValue={settings.defaultTurnLimit}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <Toggle
          name="telemetryEnabled"
          defaultOn={settings.telemetryEnabled}
          label="Telemetry collection"
          hint="Log events to the internal observability store."
        />

        <Toggle
          name="signupsOpen"
          defaultOn={settings.signupsOpen}
          label="Open sign-ups"
          hint="Allow new designers to request access without manual invitation."
        />

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            className="bg-accent text-white px-5 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Save settings
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({
  name,
  defaultOn,
  label,
  hint,
}: {
  name: string;
  defaultOn: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultOn}
        className="mt-1 h-4 w-4 accent-accent"
      />
    </label>
  );
}
