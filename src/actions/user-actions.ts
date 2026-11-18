"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role, UserType } from "@prisma/client";

export async function getUsers() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Access denied");

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      userType: true,
      createdAt: true,
      _count: { select: { tickets: true, assigned: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPicsAndPms() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const [pics, pms] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PIC" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "PROJECT_MANAGER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { pics, pms };
}

export async function checkUserEmail(email: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const trimmed = email.trim();
  if (!trimmed) return { exists: false };

  const existing = await prisma.user.findFirst({
    where: { email: { equals: trimmed, mode: "insensitive" } },
    select: { id: true, name: true, role: true, userType: true },
  });

  return {
    exists: Boolean(existing),
    user: existing,
  };
}

export async function createUser(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { error: "Access denied" };

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const role = formData.get("role") as Role;
  const userType = ((formData.get("userType") as string) || "INTERNAL") as UserType;

  if (!name || !email) return { error: "Nama dan email wajib diisi" };
  if (!["USER", "PIC", "PROJECT_MANAGER", "ADMIN"].includes(role)) {
    return { error: "Role tidak valid" };
  }
  if (!["INTERNAL", "MICROSOFT_365"].includes(userType)) {
    return { error: "Tipe user tidak valid" };
  }

  // Validasi password untuk user INTERNAL
  if (userType === "INTERNAL") {
    if (!password) return { error: "Password wajib diisi untuk user internal" };
    if (password.length < 6) return { error: "Password minimal 6 karakter" };
  }

  try {
    // Validasi apakah email sudah terdaftar di aplikasi (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existing) {
      return { error: `User dengan email '${email}' sudah terdaftar di aplikasi.` };
    }

    let hashedPassword: string | null = null;
    if (userType === "INTERNAL" && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        userType,
      },
    });

    revalidatePath("/admin/users");
    return { success: true, user };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { error: "Email sudah terdaftar" };
    }
    return { error: "Gagal membuat user baru: " + (error.message || "") };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const isSelfUpdate = session.user.id === id;
  if (!isSelfUpdate && session.user.role !== "ADMIN") {
    return { error: "Access denied" };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = formData.get("role") as Role;
  const userType = formData.get("userType") as UserType;
  const password = formData.get("password") as string;

  if (role && session.user.role !== "ADMIN") {
    return { error: "Hanya admin yang dapat mengubah role" };
  }
  if (role && !["USER", "PIC", "PROJECT_MANAGER", "ADMIN"].includes(role)) {
    return { error: "Role tidak valid" };
  }
  if (userType && !["INTERNAL", "MICROSOFT_365"].includes(userType)) {
    return { error: "Tipe user tidak valid" };
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  if (userType) updateData.userType = userType;

  if (password && password.length > 0) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const existing = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id },
    },
  });
  if (existing) return { error: "Email sudah digunakan oleh user lain" };

  await prisma.user.update({ where: { id }, data: updateData });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { error: "Access denied" };
  if (session.user.id === id) return { error: "Cannot delete your own account" };

  const ticketCount = await prisma.ticket.count({
    where: { OR: [{ userId: id }, { assignedToId: id }] },
  });
  if (ticketCount > 0) {
    return { error: "Cannot delete user with existing tickets" };
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  return { success: true };
}
