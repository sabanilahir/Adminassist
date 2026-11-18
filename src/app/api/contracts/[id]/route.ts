import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      customerId,
      contractNumber,
      correctiveMandays,
      preventiveMandays,
      projectManagerId,
      picIds,
      slaPolicyId,
      documentUrls,
      contactName,
      contactEmail,
      contactPhone,
      startDate,
      endDate,
    } = body;

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        customer: customerId ? { connect: { id: customerId } } : undefined,
        contractNumber: contractNumber || null,
        correctiveMandays: correctiveMandays ? Number(correctiveMandays) : 0,
        preventiveMandays: preventiveMandays ? Number(preventiveMandays) : 0,
        documentUrls: Array.isArray(documentUrls) ? documentUrls : [],
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,

        projectManager: projectManagerId
          ? { connect: { id: projectManagerId } }
          : { disconnect: true },

        slaPolicy: slaPolicyId
          ? { connect: { id: slaPolicyId } }
          : { disconnect: true },

        pics: {
          set: Array.isArray(picIds)
            ? picIds.map((picId: string) => ({ id: picId }))
            : [],
        },
      },
      include: {
        customer: true,
        projectManager: true,
        pics: true,
        slaPolicy: true,
      },
    });

    return NextResponse.json(updatedContract);
  } catch (error: any) {
    console.error("Error updating contract:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui kontrak." },
      { status: 500 }
    );
  }
}
