"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getTickets(filters?: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const where: any = {};
  const role = session.user.role;

  if (role === "USER") {
    where.userId = session.user.id;
  } else if (role === "PIC") {
    where.contract = { pics: { some: { id: session.user.id } } };
    where.assignedToId = session.user.id;
    // Pengecualian agar tiket REJECTED / NOT_APPLICABLE / CLOSED hilang dari Inbox PIC
    where.status = { notIn: ["REJECTED", "NOT_APPLICABLE", "CLOSED"] };
  } else if (role === "PROJECT_MANAGER") {
    where.contract = { projectManagerId: session.user.id };
    // Pengecualian agar tiket REJECTED / NOT_APPLICABLE / CLOSED hilang dari Inbox PM
    where.status = { notIn: ["REJECTED", "NOT_APPLICABLE", "CLOSED"] };
  }

  // Filter manual dari UI
  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.priority) where.priority = filters.priority;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { trackingId: { contains: filters.search, mode: "insensitive" } },
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
      { customer: { company: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const take = filters?.limit ? Number(filters.limit) : undefined;
  const skip = filters?.offset ? Number(filters.offset) : undefined;

  return prisma.ticket.findMany({
    where,
    take,
    skip,
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
      customer: { select: { id: true, customerCode: true, name: true, company: true } },
      contract: {
        select: {
          id: true,
          contractNumber: true,
          slaPolicy: { select: { id: true, name: true } },
        },
      },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTicket(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
      customer: {
        select: { id: true, customerCode: true, name: true, company: true, email: true, phone: true },
      },
      contract: {
        select: {
          id: true,
          contractNumber: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          slaPolicy: true,
          projectManager: { select: { id: true, name: true, email: true } },
          pics: { select: { id: true, name: true, email: true } },
        },
      },
      comments: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      activities: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getDashboardStats() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  let userFilter: any = {};

  if (session.user.role === "USER") {
    userFilter = { userId: session.user.id };
  } else if (session.user.role === "PIC") {
    userFilter = {
      contract: { pics: { some: { id: session.user.id } } },
      assignedToId: session.user.id,
    };
  } else if (session.user.role === "PROJECT_MANAGER") {
    userFilter = { contract: { projectManagerId: session.user.id } };
  }

  const [total, open, resolved, newT, high, notApp, rejected] = await Promise.all([
    prisma.ticket.count({ where: userFilter }),
    prisma.ticket.count({
      where: {
        ...userFilter,
        status: { notIn: ["RESOLVED", "CLOSED", "NOT_APPLICABLE", "REJECTED"] },
      },
    }),
    prisma.ticket.count({ where: { ...userFilter, status: "RESOLVED" } }),
    prisma.ticket.count({ where: { ...userFilter, status: "NEW" } }),
    prisma.ticket.count({
      where: {
        ...userFilter,
        priority: "HIGH",
        status: { notIn: ["RESOLVED", "CLOSED", "NOT_APPLICABLE", "REJECTED"] },
      },
    }),
    prisma.ticket.count({ where: { ...userFilter, status: "NOT_APPLICABLE" } }),
    prisma.ticket.count({ where: { ...userFilter, status: "REJECTED" } }),
  ]);

  const statusCounts = await prisma.ticket.groupBy({ by: ["status"], where: userFilter, _count: true });
  const priorityCounts = await prisma.ticket.groupBy({ by: ["priority"], where: userFilter, _count: true });

  const statusColors: any = {
    NEW: "#3b82f6",
    IN_PROGRESS: "#f59e0b",
    WAITING_REPLY: "#6b7280",
    REPLIED: "#22c55e",
    ON_HOLD: "#ef4444",
    REJECTED: "#dc2626",
    NOT_APPLICABLE: "#6b7280",
    RESOLVED: "#10b981",
    CONFIRMED: "#22c55e",
    CLOSED: "#10b981",
  };
  const priorityColors: any = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444" };

  const statusData = statusCounts.map((s: any) => ({
    name: s.status.replace("_", " "),
    value: s._count,
    color: statusColors[s.status] || "#6b7280",
  }));

  const priorityData = priorityCounts.map((p: any) => ({
    name: p.priority,
    value: p._count,
    color: priorityColors[p.priority] || "#6b7280",
  }));

  return {
    totalTickets: total,
    openTickets: open,
    resolvedTickets: resolved,
    newTickets: newT,
    highPriorityTickets: high,
    notApplicableTickets: notApp,
    rejectedTickets: rejected,
    chartData: { statusData, priorityData, customerData: [] },
  };
}
