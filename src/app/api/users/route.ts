import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role"); // PIC, PROJECT_MANAGER, or all

    let whereClause: any = {};
    if (role === "PIC") {
      whereClause = { role: "PIC" };
    } else if (role === "PROJECT_MANAGER") {
      whereClause = { role: "PROJECT_MANAGER" };
    } else if (role === "PIC_PROJECT_MANAGER") {
      whereClause = { role: { in: ["PIC", "PROJECT_MANAGER"] } };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}