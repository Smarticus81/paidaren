import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./db";

export type AdminSession = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN";
};

export async function requireAdmin(): Promise<AdminSession> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, disabled: true },
  });

  if (!user || user.disabled || user.role !== "ADMIN") {
    redirect("/");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: "ADMIN",
  };
}

export async function isAdmin(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, disabled: true },
  });
  return !!user && !user.disabled && user.role === "ADMIN";
}
