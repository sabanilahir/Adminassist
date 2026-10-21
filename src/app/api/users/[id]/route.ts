import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: Mengambil data user berdasarkan ID
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params; // <-- Await params di sini

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Gagal memuat data user" }, { status: 500 });
  }
}

// PATCH: Mengupdate data user (Nama, Email, Role, Password)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params; // <-- Await params di sini

    const body = await request.json();
    const { name, email, role, password } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;

    // Jika password diisi, hash password barunya
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id }, // Menggunakan id yang sudah di-await
      data: updateData,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Gagal mengupdate user" }, { status: 500 });
  }
}

// DELETE: Menghapus user berdasarkan ID
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params; // <-- Await params di sini

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: "User berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Gagal menghapus user" }, { status: 500 });
  }
}