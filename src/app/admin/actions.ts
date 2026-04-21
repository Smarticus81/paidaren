"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logEvent } from "@/lib/telemetry";

const UserRoleSchema = z.enum(["INSTRUCTIONAL_DESIGNER", "ADMIN"]);

const InviteSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  role: UserRoleSchema,
});

export type InviteResult =
  | { ok: true; created: boolean; userId: string; email: string; role: "ADMIN" | "INSTRUCTIONAL_DESIGNER" }
  | { ok: false; error: string };

export async function inviteUser(_prev: InviteResult | null, formData: FormData): Promise<InviteResult> {
  const admin = await requireAdmin();

  const parsed = InviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const { email, role } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, disabled: true },
  });

  let userId: string;
  let created = false;

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role, disabled: false },
    });
    userId = existing.id;
  } else {
    const user = await prisma.user.create({
      data: { email, role },
      select: { id: true },
    });
    userId = user.id;
    created = true;
  }

  await logEvent({
    kind: created ? "admin.user.invited" : "admin.user.role_changed",
    severity: "WARN",
    message: created
      ? `Invited ${email} as ${role}`
      : `Granted ${role} to existing user ${email}`,
    userId: admin.id,
    userEmail: admin.email,
    metadata: { targetUserId: userId, targetEmail: email, role, created },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");

  return { ok: true, created, userId, email, role };
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const admin = await requireAdmin();
  const parsed = UserRoleSchema.parse(role);

  if (userId === admin.id && parsed !== "ADMIN") {
    throw new Error("You cannot demote yourself.");
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { role: parsed },
  });

  await logEvent({
    kind: "admin.user.role_changed",
    severity: "WARN",
    message: `Role changed to ${parsed}`,
    userId: admin.id,
    userEmail: admin.email,
    metadata: {
      targetUserId: userId,
      targetEmail: before?.email,
      from: before?.role,
      to: parsed,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<void> {
  const admin = await requireAdmin();

  if (userId === admin.id && disabled) {
    throw new Error("You cannot disable your own account.");
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, disabled: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { disabled },
  });

  if (disabled) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await logEvent({
    kind: disabled ? "admin.user.disabled" : "admin.user.enabled",
    severity: "WARN",
    message: disabled ? "User access revoked" : "User access restored",
    userId: admin.id,
    userEmail: admin.email,
    metadata: {
      targetUserId: userId,
      targetEmail: before?.email,
    },
  });

  revalidatePath("/admin/users");
}

const SettingsSchema = z.object({
  platformName: z.string().min(1).max(100),
  supportEmail: z.string().email().or(z.literal("")).optional(),
  defaultRigor: z.enum(["INTRODUCTORY", "STANDARD", "RIGOROUS", "EXAM_LEVEL"]),
  defaultTurnLimit: z.coerce.number().int().min(6).max(20),
  telemetryEnabled: z.enum(["on", "off"]).transform((v) => v === "on"),
  signupsOpen: z.enum(["on", "off"]).transform((v) => v === "on"),
});

export async function saveSettings(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const parsed = SettingsSchema.parse({
    platformName: formData.get("platformName"),
    supportEmail: formData.get("supportEmail") ?? "",
    defaultRigor: formData.get("defaultRigor"),
    defaultTurnLimit: formData.get("defaultTurnLimit"),
    telemetryEnabled: formData.get("telemetryEnabled") ?? "off",
    signupsOpen: formData.get("signupsOpen") ?? "off",
  });

  for (const [key, value] of Object.entries(parsed)) {
    await prisma.adminSetting.upsert({
      where: { key },
      update: { value: value as never, updatedBy: admin.id },
      create: { key, value: value as never, updatedBy: admin.id },
    });
  }

  await logEvent({
    kind: "admin.settings.updated",
    severity: "INFO",
    message: "Platform settings saved",
    userId: admin.id,
    userEmail: admin.email,
    metadata: { keys: Object.keys(parsed) },
  });

  revalidatePath("/admin/settings");
}

export async function clearOldTelemetry(olderThanDays: number): Promise<void> {
  const admin = await requireAdmin();
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await prisma.telemetryEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  await logEvent({
    kind: "admin.telemetry.pruned",
    severity: "INFO",
    message: `Deleted ${result.count} events older than ${olderThanDays}d`,
    userId: admin.id,
    userEmail: admin.email,
    metadata: { deleted: result.count, olderThanDays },
  });

  revalidatePath("/admin/telemetry");
  revalidatePath("/admin");
}
