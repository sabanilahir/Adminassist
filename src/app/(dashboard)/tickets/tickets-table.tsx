"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Eye } from "lucide-react";
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
  user: { name: string };
  createdAt: Date;
}

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_REPLY", label: "Waiting Reply" },
  { value: "REPLIED", label: "Replied" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "REJECTED", label: "Rejected" }, // <-- Ditambahkan di sini
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
    REJECTED: "danger", // <-- Menggunakan varian 'danger' (merah) untuk Rejected
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const columns = useMemo<ColumnDef<TicketData>[]>(
    () => [
      {
        accessorKey: "trackingId",
        header: "Ticket ID",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.getValue("trackingId")}</span>
        ),
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-md truncate">{row.getValue("title")}</div>
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
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <Badge variant={getPriorityBadge(row.getValue("priority") as string)}>
            {row.getValue("priority") as string}
          </Badge>
        ),
      },
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
            <span className="text-amber-600 font-medium italic">Unassigned</span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
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
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        ),
      },
    ],
    []
  );

  const filteredData = useMemo(() => {
    let data = tickets;
    
    if (statusFilter !== "all") {
      data = data.filter((t) => t.status === statusFilter);
    }
    
    if (priorityFilter !== "all") {
      data = data.filter((t) => t.priority === priorityFilter);
    }
    
    return data;
  }, [tickets, statusFilter, priorityFilter]);

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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="h-12 px-4 text-left align-middle font-medium">
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
                <td colSpan={columns.length} className="h-24 text-center">
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows?.length} of {filteredData.length} tickets
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
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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