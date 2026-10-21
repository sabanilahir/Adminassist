"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

export async function getUsers() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Access denied");

  return prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      _count: { select: { tickets: true, assigned: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPicsAndPms() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const [pics, pms] = await Promise.all([
    prisma.user.findMany({ where: { role: "PIC" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "PROJECT_MANAGER" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);

  return { pics, pms };
}

export async function createUser(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { error: "Access denied" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as Role;

  if (!name || !email || !password) return { error: "All fields required" };
  if (!["USER", "PIC", "PROJECT_MANAGER", "ADMIN"].includes(role)) return { error: "Invalid role" };

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });
    revalidatePath("/admin/users");
    return { success: true, user };
  } catch (error: any) {
    if (error.code === "P2002") return { error: "Email already exists" };
    return { error: "Failed to create user" };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const isSelfUpdate = session.user.id === id;
  if (!isSelfUpdate && session.user.role !== "ADMIN") return { error: "Access denied" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as Role;
  const password = formData.get("password") as string;

  if (role && session.user.role !== "ADMIN") return { error: "Only admin can change role" };
  if (role && !["USER", "PIC", "PROJECT_MANAGER", "ADMIN"].includes(role)) return { error: "Invalid role" };

  const updateData: any = { name, email };
  if (role) updateData.role = role;
  if (password && password.length > 0) updateData.password = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findFirst({ where: { email, NOT: { id } } });
  if (existing) return { error: "Email already in use" };

  await prisma.user.update({ where: { id }, data: updateData });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { error: "Access denied" };
  if (session.user.id === id) return { error: "Cannot delete your own account" };

  const ticketCount = await prisma.ticket.count({ where: { OR: [{ userId: id }, { assignedToId: id }] } });
  if (ticketCount > 0) return { error: "Cannot delete user with existing tickets" };

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  return { success: true };
}