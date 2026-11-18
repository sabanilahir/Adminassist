import { z } from "zod";

export const CreateTicketSchema = z.object({
  title: z.string().min(3, "Judul tiket minimal 3 karakter").max(200),
  description: z.string().min(5, "Deskripsi tiket minimal 5 karakter"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  customerId: z.string().min(1, "Customer wajib dipilih"),
  contractId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  reporterName: z.string().nullable().optional(),
  reportedAt: z.string().nullable().optional(),
  attachments: z.array(z.string()).optional().default([]),
});

export const UpdateTicketSchema = z.object({
  status: z
    .enum([
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_REPLY",
      "REPLIED",
      "ON_HOLD",
      "NOT_APPLICABLE",
      "RESOLVED",
      "CONFIRMED",
      "CLOSED",
      "REJECTED",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assignedToId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  rootCause: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  mandaysSpent: z.number().min(0).optional(),
  mandaysType: z.enum(["HOURS", "MANDAYS"]).optional(),
  mandaysCategory: z.enum(["CORRECTIVE", "PREVENTIVE"]).optional(),
  reportedAt: z.string().nullable().optional(),
  reporterName: z.string().nullable().optional(),
  attachments: z.array(z.string()).optional(),
});
