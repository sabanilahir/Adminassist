import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        customer: { 
          select: { id: true, customerCode: true, name: true, company: true }
        },
        contract: {
          select: {
            id: true,
            contractNumber: true,
            pics: { select: { id: true, name: true, email: true } },
            projectManager: { select: { id: true, name: true } }
          }
        }
      }
    });
    
    if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error Fetching Ticket Detail:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role === "USER") return NextResponse.json({ error: "Access denied" }, { status: 403 });
    
    const { id } = await params;
    const body = await request.json();
    
    const existingTicket = await prisma.ticket.findUnique({ where: { id } });
    if (!existingTicket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    
    // Perbaikan relasi Category menggunakan connect/disconnect
    if (body.categoryId !== undefined) {
      updateData.category = body.categoryId 
        ? { connect: { id: body.categoryId } } 
        : { disconnect: true };
    }
    
    // Perbaikan relasi assignedTo menggunakan connect/disconnect
    if (body.assignedToId !== undefined) {
      updateData.assignedTo = body.assignedToId 
        ? { connect: { id: body.assignedToId } } 
        : { disconnect: true };
    }
    
    if (body.rootCause !== undefined) updateData.rootCause = body.rootCause;
    if (body.resolution !== undefined) updateData.resolution = body.resolution;
    
    if (body.mandaysSpent !== undefined) updateData.mandaysSpent = parseFloat(body.mandaysSpent) || 0;
    if (body.mandaysType !== undefined) updateData.mandaysType = body.mandaysType;
    if (body.mandaysCategory !== undefined) updateData.mandaysCategory = body.mandaysCategory;

    const targetStatus = body.status || existingTicket.status;
    if (targetStatus === "RESOLVED") {
      const finalRootCause = body.rootCause !== undefined ? body.rootCause : existingTicket.rootCause;
      const finalResolution = body.resolution !== undefined ? body.resolution : existingTicket.resolution;
      const finalMandays = body.mandaysSpent !== undefined ? body.mandaysSpent : existingTicket.mandaysSpent;
      const finalCategory = body.mandaysCategory !== undefined ? body.mandaysCategory : existingTicket.mandaysCategory;

      if (!finalRootCause || !finalResolution || finalRootCause.trim() === "" || finalResolution.trim() === "") {
        return NextResponse.json(
          { error: "Root Cause Analysis dan Resolution wajib diisi sebelum menyelesaikan tiket." }, 
          { status: 400 }
        );
      }

      if (finalMandays === undefined || finalMandays <= 0) {
        return NextResponse.json(
          { error: "Lama pekerjaan (Mandays/Jam) wajib diisi dan bernilai lebih dari 0." }, 
          { status: 400 }
        );
      }

      if (!finalCategory) {
        return NextResponse.json(
          { error: "Jenis mandays (Corrective / Preventive) wajib dipilih." }, 
          { status: 400 }
        );
      }

      if (existingTicket.status !== "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }
    
    // 1. Update data tiket
    const ticket = await prisma.ticket.update({ 
      where: { id }, 
      data: updateData 
    });

    // 2. Akumulasi mandays ke Contract jika berstatus RESOLVED dan terikat kontrak
    if (targetStatus === "RESOLVED" && ticket.contractId) {
      const contract = await prisma.contract.findUnique({ where: { id: ticket.contractId } });
      
      if (contract) {
        const newSpentValue = ticket.mandaysSpent;
        const newMandaysInUnit = ticket.mandaysType === "HOURS" ? newSpentValue / 8 : newSpentValue;

        const oldSpentValue = existingTicket.status === "RESOLVED" ? (existingTicket.mandaysSpent || 0) : 0;
        const oldMandaysInUnit = existingTicket.mandaysType === "HOURS" ? oldSpentValue / 8 : oldSpentValue;

        const category = ticket.mandaysCategory || "CORRECTIVE";
        const oldCategory = existingTicket.mandaysCategory || "CORRECTIVE";

        if (existingTicket.status === "RESOLVED") {
          if (oldCategory === category) {
            const diff = newMandaysInUnit - oldMandaysInUnit;
            if (category === "CORRECTIVE") {
              await prisma.contract.update({
                where: { id: contract.id },
                data: { usedCorrective: { increment: diff } }
              });
            } else {
              await prisma.contract.update({
                where: { id: contract.id },
                data: { usedPreventive: { increment: diff } }
              });
            }
          } else {
            if (oldCategory === "CORRECTIVE") {
              await prisma.contract.update({
                where: { id: contract.id },
                data: { usedCorrective: { decrement: oldMandaysInUnit } }
              });
            } else {
              await prisma.contract.update({
                where: { id: contract.id },
                data: { usedPreventive: { decrement: oldMandaysInUnit } }
              });
            }

            if (category === "CORRECTIVE") {
              await prisma.contract.update({
                where: { id: contract.id },
                data: { usedCorrective: { increment: newMandaysInUnit } }
              });
            } else {
              await prisma.contract.update({
                where: { id: contract.id },
                data: { usedPreventive: { increment: newMandaysInUnit } }
              });
            }
          }
        } else {
          if (category === "CORRECTIVE") {
            await prisma.contract.update({
              where: { id: contract.id },
              data: { usedCorrective: { increment: newMandaysInUnit } }
            });
          } else {
            await prisma.contract.update({
              where: { id: contract.id },
              data: { usedPreventive: { increment: newMandaysInUnit } }
            });
          }
        }
      }
    }
    
    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Error Updating Ticket:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}