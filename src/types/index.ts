import { Role, Priority, Status } from "@prisma/client";

export type { Role, Priority, Status };

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TicketWithRelations {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  userId: string;
  agentId: string | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  agent?: {
    id: string;
    name: string;
    email: string;
  } | null;
  category?: {
    id: string;
    name: string;
  } | null;
  comments: CommentWithUser[];
}

export interface CommentWithUser {
  id: string;
  content: string;
  isInternal: boolean;
  ticketId: string;
  userId: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface CategoryWithCount {
  id: string;
  name: string;
  _count: {
    tickets: number;
  };
}

export interface TicketFilters {
  status?: Status;
  priority?: Priority;
  categoryId?: string;
  agentId?: string;
  userId?: string;
  customerId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  newTickets: number;
  highPriorityTickets: number;
}

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  contractNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
