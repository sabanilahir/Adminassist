import { prisma } from "@/lib/prisma";
import { Priority } from "@prisma/client";

export async function calculateTicketDueDate(
  contractId: string | null | undefined,
  priority: Priority,
  baseDate: Date = new Date()
): Promise<Date> {
  let resolutionHours = 24; // Default medium fallback

  try {
    // 1. Cek apakah kontrak memiliki SLA Policy khusus
    let slaPolicy = null;
    if (contractId) {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { slaPolicy: true },
      });
      if (contract?.slaPolicy) {
        slaPolicy = contract.slaPolicy;
      }
    }

    // 2. Jika tidak ada, ambil default SLA Policy
    if (!slaPolicy) {
      slaPolicy = await prisma.slaPolicy.findFirst({
        where: { isDefault: true },
      });
    }

    // 3. Tentukan jam berdasarkan priority
    if (slaPolicy) {
      switch (priority) {
        case "HIGH":
          resolutionHours = slaPolicy.resolutionHoursHigh;
          break;
        case "MEDIUM":
          resolutionHours = slaPolicy.resolutionHoursMedium;
          break;
        case "LOW":
          resolutionHours = slaPolicy.resolutionHoursLow;
          break;
        default:
          resolutionHours = slaPolicy.resolutionHoursMedium;
      }
    } else {
      // Hardcoded fallback jika DB kosong
      switch (priority) {
        case "HIGH":
          resolutionHours = 4;
          break;
        case "MEDIUM":
          resolutionHours = 24;
          break;
        case "LOW":
          resolutionHours = 72;
          break;
      }
    }
  } catch (error) {
    console.error("Gagal menghitung SLA Due Date, menggunakan default:", error);
    resolutionHours = priority === "HIGH" ? 4 : priority === "LOW" ? 72 : 24;
  }

  return new Date(baseDate.getTime() + resolutionHours * 60 * 60 * 1000);
}
