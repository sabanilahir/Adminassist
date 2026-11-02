"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Eye, Filter, Building, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface TicketData {
  id: string;
  trackingId: string;
  title: string;
  status: string;
  priority: string;
  category: { name: string } | null;
  assignedTo: { name: string } | null;
  customer?: { id?: string; name: string; company?: string | null } | null;
  user: { name: string };
  reporterName?: string | null;
  reportedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_REPLY", label: "Waiting Reply" },
  { value: "REPLIED", label: "Replied" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
];

const priorityOptions = [
  { value: "all", label: "All Priority" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const getStatusBadge = (status: string) => {
  const variants: Record<string, "success" | "warning" | "danger" | "info" | "secondary" | "outline"> = {
    NEW: "info", 
    IN_PROGRESS: "warning", 
    WAITING_REPLY: "secondary", 
    REPLIED: "success", 
    ON_HOLD: "danger", 
    REJECTED: "danger",
    RESOLVED: "success",
    CLOSED: "secondary",
    NOT_APPLICABLE: "outline",
  };
  return variants[status] || "secondary";
};

const getPriorityBadge = (priority: string) => {
  const variants: Record<string, "success" | "warning" | "danger"> = {
    LOW: "success", 
    MEDIUM: "warning", 
    HIGH: "danger",
  };
  return variants[priority] || "secondary";
};

interface TicketsTableProps {
  tickets: TicketData[];
}

export function TicketsTable({ tickets }: TicketsTableProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role?.trim().toUpperCase();
  const isPriorityHidden = userRole === "ADMIN_TICKET" || userRole === "USER";

  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true }
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [ticketIdFilter, setTicketIdFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const columns = useMemo<ColumnDef<TicketData>[]>(() => {
    const baseCols: ColumnDef<TicketData>[] = [
      {
        accessorKey: "trackingId",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 font-semibold"
          >
            Nomor Tiket
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium text-primary">
            {row.getValue("trackingId")}
          </span>
        ),
      },
      {
        id: "customerName",
        accessorFn: (row) => row.customer?.company || row.customer?.name || "-",
        header: "Customer",
        cell: ({ row }) => (
          <div className="font-medium text-sm">
            {row.original.customer?.company || row.original.customer?.name || "-"}
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 font-semibold"
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-xs truncate font-medium">{row.getValue("title")}</div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={getStatusBadge(row.getValue("status") as string)}>
            {(row.getValue("status") as string).replace("_", " ")}
          </Badge>
        ),
      },
    ];

    // Priority column: hanya muncul jika bukan ADMIN_TICKET dan bukan USER
    if (!isPriorityHidden) {
      baseCols.push({
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <Badge variant={getPriorityBadge(row.getValue("priority") as string)}>
            {row.getValue("priority") as string}
          </Badge>
        ),
      });
    }

    baseCols.push(
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => row.original.category?.name || "Uncategorized",
      },
      {
        accessorKey: "assignedTo",
        header: "Assigned To",
        cell: ({ row }) => {
          const assigned = row.original.assignedTo;
          return assigned ? (
            <span className="font-medium text-foreground">{assigned.name}</span>
          ) : (
            <span className="text-amber-600 font-medium italic text-xs">Unassigned</span>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 font-semibold"
          >
            Last Updated
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const val = row.getValue("updatedAt");
          return val ? new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short" }).format(new Date(val as string)) : "-";
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 font-semibold"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => formatDate(row.getValue("createdAt")),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Link href={`/tickets/${row.original.id}`}>
            <Button variant="ghost" size="icon" title="View Detail">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        ),
      }
    );

    return baseCols;
  }, [isPriorityHidden]);

  const filteredData = useMemo(() => {
    let data = tickets;
    
    // Filter berdasarkan nomor tiket (trackingId)
    if (ticketIdFilter.trim()) {
      const q = ticketIdFilter.trim().toLowerCase();
      data = data.filter((t) => t.trackingId?.toLowerCase().includes(q));
    }

    // Filter berdasarkan nama customer
    if (customerFilter.trim()) {
      const q = customerFilter.trim().toLowerCase();
      data = data.filter((t) => {
        const custName = t.customer?.name?.toLowerCase() || "";
        const custComp = t.customer?.company?.toLowerCase() || "";
        return custName.includes(q) || custComp.includes(q);
      });
    }

    if (statusFilter !== "all") {
      data = data.filter((t) => t.status === statusFilter);
    }
    
    if (!isPriorityHidden && priorityFilter !== "all") {
      data = data.filter((t) => t.priority === priorityFilter);
    }
    
    return data;
  }, [tickets, ticketIdFilter, customerFilter, statusFilter, priorityFilter, isPriorityHidden]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-card p-4 rounded-lg border space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Filter Nomor Tiket */}
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter Nomor Tiket..."
              value={ticketIdFilter}
              onChange={(e) => setTicketIdFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Nama Customer */}
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter Nama Customer..."
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter Priority (Hanya untuk yang berhak) */}
          {!isPriorityHidden ? (
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pencarian umum..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        {!isPriorityHidden && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pencarian umum kata kunci tiket..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-accent/50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Tidak ada tiket yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {table.getRowModel().rows?.length} dari {filteredData.length} tiket
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Halaman {table.getState().pagination.pageIndex + 1} dari {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
