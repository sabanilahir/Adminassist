"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getSlaPolicies() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const policies = await prisma.slaPolicy.findMany({
    include: {
      _count: {
        select: { contracts: true },
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  // Untuk policy isDefault, hitung juga kontrak yang slaPolicyId-nya null (karena otomatis mengikuti default SLA)
  const unassignedCount = await prisma.contract.count({
    where: { slaPolicyId: null },
  });

  return policies.map((p) => {
    if (p.isDefault) {
      return {
        ...p,
        _count: {
          contracts: p._count.contracts + unassignedCount,
        },
      };
    }
    return p;
  });
}

export async function getContractsBySlaPolicy(slaPolicyId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const policy = await prisma.slaPolicy.findUnique({
    where: { id: slaPolicyId },
    select: { id: true, name: true, isDefault: true },
  });

  if (!policy) return [];

  const where = policy.isDefault
    ? {
        OR: [{ slaPolicyId: policy.id }, { slaPolicyId: null }],
      }
    : { slaPolicyId: policy.id };

  return prisma.contract.findMany({
    where,
    select: {
      id: true,
      contractNumber: true,
      startDate: true,
      endDate: true,
      contactName: true,
      contactEmail: true,
      customer: {
        select: {
          id: true,
          name: true,
          company: true,
          customerCode: true,
        },
      },
      projectManager: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSlaPolicy(data: {
  name: string;
  description?: string;
  criteria?: string;
  criteriaHigh?: string;
  criteriaMedium?: string;
  criteriaLow?: string;
  responseHoursHigh: number;
  resolutionHoursHigh: number;
  responseHoursMedium: number;
  resolutionHoursMedium: number;
  responseHoursLow: number;
  resolutionHoursLow: number;
  isDefault?: boolean;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Akses ditolak: Hanya Sistem Administrator yang dapat mengelola SLA." };
  }

  if (!data.name || data.name.trim() === "") {
    return { error: "Nama SLA Policy wajib diisi." };
  }

  try {
    // Jika isDefault = true, reset default policy yang lain
    if (data.isDefault) {
      await prisma.slaPolicy.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const policy = await prisma.slaPolicy.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        criteria: data.criteria?.trim() || null,
        criteriaHigh: data.criteriaHigh?.trim() || null,
        criteriaMedium: data.criteriaMedium?.trim() || null,
        criteriaLow: data.criteriaLow?.trim() || null,
        responseHoursHigh: Number(data.responseHoursHigh) || 1,
        resolutionHoursHigh: Number(data.resolutionHoursHigh) || 4,
        responseHoursMedium: Number(data.responseHoursMedium) || 4,
        resolutionHoursMedium: Number(data.resolutionHoursMedium) || 24,
        responseHoursLow: Number(data.responseHoursLow) || 8,
        resolutionHoursLow: Number(data.resolutionHoursLow) || 72,
        isDefault: Boolean(data.isDefault),
      },
    });

    revalidatePath("/sla");
    revalidatePath("/admin/settings/sla");
    revalidatePath("/admin/contracts");
    return { success: true, policy };
  } catch (error: any) {
    console.error("Gagal membuat SLA Policy:", error);
    if (error.code === "P2002") {
      return { error: "Nama SLA Policy sudah digunakan." };
    }
    return { error: "Terjadi kesalahan pada sistem." };
  }
}

export async function updateSlaPolicy(
  id: string,
  data: {
    name: string;
    description?: string;
    criteria?: string;
    criteriaHigh?: string;
    criteriaMedium?: string;
    criteriaLow?: string;
    responseHoursHigh: number;
    resolutionHoursHigh: number;
    responseHoursMedium: number;
    resolutionHoursMedium: number;
    responseHoursLow: number;
    resolutionHoursLow: number;
    isDefault?: boolean;
  }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Akses ditolak: Hanya Sistem Administrator yang dapat mengelola SLA." };
  }

  try {
    if (data.isDefault) {
      await prisma.slaPolicy.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const policy = await prisma.slaPolicy.update({
      where: { id },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        criteria: data.criteria?.trim() || null,
        criteriaHigh: data.criteriaHigh?.trim() || null,
        criteriaMedium: data.criteriaMedium?.trim() || null,
        criteriaLow: data.criteriaLow?.trim() || null,
        responseHoursHigh: Number(data.responseHoursHigh),
        resolutionHoursHigh: Number(data.resolutionHoursHigh),
        responseHoursMedium: Number(data.responseHoursMedium),
        resolutionHoursMedium: Number(data.resolutionHoursMedium),
        responseHoursLow: Number(data.responseHoursLow),
        resolutionHoursLow: Number(data.resolutionHoursLow),
        isDefault: Boolean(data.isDefault),
      },
    });

    revalidatePath("/sla");
    revalidatePath("/admin/settings/sla");
    revalidatePath("/admin/contracts");
    return { success: true, policy };
  } catch (error: any) {
    console.error("Gagal update SLA Policy:", error);
    if (error.code === "P2002") {
      return { error: "Nama SLA Policy sudah digunakan." };
    }
    return { error: "Terjadi kesalahan pada sistem." };
  }
}

export async function deleteSlaPolicy(id: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Hanya Super Admin yang dapat menghapus SLA Policy." };
  }

  try {
    const policy = await prisma.slaPolicy.findUnique({
      where: { id },
      include: { _count: { select: { contracts: true } } },
    });

    if (!policy) return { error: "SLA Policy tidak ditemukan." };
    if (policy.isDefault) {
      return { error: "Kebijakan SLA bawaan (Default) tidak dapat dihapus." };
    }
    if (policy._count.contracts > 0) {
      return {
        error: `Tidak dapat menghapus: Masih ada ${policy._count.contracts} kontrak yang menggunakan SLA ini.`,
      };
    }

    await prisma.slaPolicy.delete({ where: { id } });

    revalidatePath("/sla");
    revalidatePath("/admin/settings/sla");
    revalidatePath("/admin/contracts");
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus SLA Policy:", error);
    return { error: "Gagal menghapus SLA Policy." };
  }
}

export async function setDefaultSlaPolicy(id: string) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Hanya Super Admin yang dapat mengubah default SLA." };
  }

  try {
    await prisma.$transaction([
      prisma.slaPolicy.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      prisma.slaPolicy.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/sla");
    revalidatePath("/admin/settings/sla");
    return { success: true };
  } catch (error) {
    console.error("Gagal mengubah default SLA:", error);
    return { error: "Gagal menetapkan default SLA." };
  }
}
