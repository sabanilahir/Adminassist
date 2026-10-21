import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categoryId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
  isInternal: z.boolean().default(false),
});

export const updateTicketSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "WAITING_REPLY", "REPLIED", "ON_HOLD", "RESOLVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  agentId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["USER", "AGENT", "ADMIN"]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TicketInput = z.infer<typeof ticketSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;