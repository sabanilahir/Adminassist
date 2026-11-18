import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchOffice365Users, AzureDirectoryUser } from "@/lib/azure-graph";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    let directoryUsers: AzureDirectoryUser[] = [];
    try {
      directoryUsers = await searchOffice365Users(query, 8);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Gagal menghubungi Microsoft Graph API" },
        { status: 400 }
      );
    }

    if (directoryUsers.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Periksa apakah user-user ini sudah terdaftar di database aplikasi ASSIST
    const emails = directoryUsers.map((u) => u.email.toLowerCase());
    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: emails,
          mode: "insensitive",
        },
      },
      select: {
        email: true,
        name: true,
        role: true,
      },
    });

    const existingEmailSet = new Set(
      existingUsers.map((u) => u.email.toLowerCase())
    );

    const enrichedUsers = directoryUsers.map((u) => ({
      ...u,
      isAlreadyAdded: existingEmailSet.has(u.email.toLowerCase()),
    }));

    return NextResponse.json({ users: enrichedUsers });
  } catch (error: any) {
    console.error("Error in /api/azure/users:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
