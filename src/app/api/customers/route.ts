import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    let whereClause: any = { isActive: true };
    if (query) {
      whereClause = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { customerCode: { contains: query, mode: "insensitive" } },
          { company: { contains: query, mode: "insensitive" } },
        ],
      };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      // Tambahkan include ini agar data kontrak dan PM terbawa ke frontend
      include: {
        contracts: {
          include: {
            projectManager: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customers, { status: 200 });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Gagal mengambil data customer" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "USER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, company, address } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    let customerCode = generateCustomerCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.customer.findUnique({ where: { customerCode } });
      if (!existing) break;
      customerCode = generateCustomerCode();
      attempts++;
    }

    // Membuat customer murni data perusahaan/profil klien
    const customer = await prisma.customer.create({
      data: {
        customerCode,
        name,
        email,
        phone: phone || null,
        company: company || null,
        address: address || null,
      },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating customer:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email or customer code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}