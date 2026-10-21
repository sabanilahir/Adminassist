"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateTrackingId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { notifyNewTicket } from "@/lib/ticket-notifications";

export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role === "USER") return { error: "Access denied" };
  
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string;
  const categoryId = formData.get("categoryId") as string;
  const customerId = formData.get("customerId") as string;
  const contractId = formData.get("contractId") as string;

  if (!title || !description || !customerId) return { error: "Required" };

  let status = "NEW";
  let assignedToId: string | null = null;

  // Cek apakah kategori yang dipilih adalah "Feature Request"
  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (category && category.name.toLowerCase().includes("feature request")) {
      // Status tetap "NEW", tapi kita assign otomatis ke Project Manager agar masuk ke inbox PM saja
      const contract = contractId 
        ? await prisma.contract.findUnique({ where: { id: contractId } })
        : await prisma.contract.findFirst({ where: { customerId } });

      if (contract?.projectManagerId) {
        assignedToId = contract.projectManagerId;
      }
    }
  }

  let trackingId = generateTrackingId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.ticket.findUnique({ where: { trackingId } });
    if (!existing) break;
    trackingId = generateTrackingId();
    attempts++;
  }

  const ticket = await prisma.ticket.create({ 
    data: { 
      trackingId, 
      title, 
      description, 
      priority: priority || "MEDIUM", 
      userId: session.user.id, 
      categoryId: categoryId || null, 
      customerId, 
      contractId: contractId || null,
      status: "NEW", // Status tetap NEW
      assignedToId: assignedToId // Ter-assign ke PM jika Feature Request
    } 
  });

  revalidatePath("/tickets");
  revalidatePath("/");

  // Send email notifications to PM and PICs (fire-and-forget)
  notifyNewTicket(ticket.id).catch(console.error);

  return { success: true, ticket };
}