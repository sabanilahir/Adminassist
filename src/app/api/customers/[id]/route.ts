import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { tickets: true, contracts: true } },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role === "USER") return NextResponse.json({ error: "Access denied" }, { status: 403 });
    
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, company, address } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (company !== undefined) updateData.company = company || null;
    if (address !== undefined) updateData.address = address || null;

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error("Error:", error);
    if (error.code === "P2002") return NextResponse.json({ error: "Email exists" }, { status: 400 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Access denied" }, { status: 403 });
    
    const { id } = await params;
    const ticketCount = await prisma.ticket.count({ where: { customerId: id } });
    
    if (ticketCount > 0) {
      await prisma.customer.update({ where: { id }, data: { isActive: false } });
      return NextResponse.json({ success: true, message: "Deactivated" });
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}