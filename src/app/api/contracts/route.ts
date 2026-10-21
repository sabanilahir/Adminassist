import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contracts = await prisma.contract.findMany({
      include: {
        customer: true,
        projectManager: { select: { id: true, name: true } },
        pics: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json({ error: "Gagal memuat kontrak" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      customerId,
      contractNumber,
      correctiveMandays,
      preventiveMandays,
      projectManagerId,
      picIds,
      documentUrls, // Gunakan documentUrls (array)
      contactName,
      contactEmail,
      contactPhone,
      startDate,
      endDate,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID wajib diisi." },
        { status: 400 }
      );
    }

    const newContract = await prisma.contract.create({
      data: {
        customer: { connect: { id: customerId } },
        contractNumber: contractNumber || null,
        correctiveMandays: correctiveMandays ? Number(correctiveMandays) : 0,
        preventiveMandays: preventiveMandays ? Number(preventiveMandays) : 0,
        
        // Memetakan array documentUrls ke database
        documentUrls: Array.isArray(documentUrls) ? documentUrls : [],

        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,

        projectManager: projectManagerId
          ? { connect: { id: projectManagerId } }
          : undefined,

        pics: {
          connect: Array.isArray(picIds)
            ? picIds.map((id: string) => ({ id }))
            : [],
        },
      },
      include: {
        customer: true,
        projectManager: true,
        pics: true,
      },
    });

    return NextResponse.json(newContract, { status: 201 });
  } catch (error: any) {
    console.error("Error creating contract:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat kontrak baru." },
      { status: 500 }
    );
  }
}