import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const policies = await prisma.slaPolicy.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Error fetching SLA policies:", error);
    return NextResponse.json({ error: "Gagal memuat SLA policies" }, { status: 500 });
  }
}
