"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function createCategory(name: string) {
  const session = await auth();
  if (!session || !session.user) return { error: "Unauthorized" };

  if (session.user.role !== "ADMIN") {
    return { error: "Access denied" };
  }

  try {
    const category = await prisma.category.create({
      data: { name },
    });
    return { success: true, category };
  } catch (error) {
    console.error("Error creating category:", error);
    return { error: "Failed to create category" };
  }
}

export async function updateCategory(id: string, name: string) {
  const session = await auth();
  if (!session || !session.user) return { error: "Unauthorized" };

  if (session.user.role !== "ADMIN") {
    return { error: "Access denied" };
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });
    return { success: true, category };
  } catch (error) {
    console.error("Error updating category:", error);
    return { error: "Failed to update category" };
  }
}

export async function deleteCategory(id: string) {
  const session = await auth();
  if (!session || !session.user) return { error: "Unauthorized" };

  if (session.user.role !== "ADMIN") {
    return { error: "Access denied" };
  }

  try {
    await prisma.category.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { error: "Failed to delete category" };
  }
}