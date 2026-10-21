"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Edit,
  Loader2,
  Save,
  X,
  Clock,
  User,
  Building,
  Hash,
  UserPlus,
  FileText,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { NotApplicableButton } from "./not-applicable-button";
import { rejectTicket } from "@/actions/ticket-actions";

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // States untuk Reject Modal Input
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectCategoryId, setRejectCategoryId] = useState("");

  // State untuk Popup Sukses Reject
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form States
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [mandaysSpent, setMandaysSpent] = useState("");
  const [mandaysType, setMandaysType] = useState("HOURS");
  const [mandaysCategory, setMandaysCategory] = useState("CORRECTIVE");

  useEffect(() => {
    fetchTicket();
    fetchCategories();
  }, [id]);

  async function fetchTicket() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${id}?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
        setStatus(data.status || "OPEN");
        setPriority(data.priority || "MEDIUM");
        setAssignedToId(data.assignedToId || "unassigned");
        setCategoryId(data.categoryId || "");
        setRootCause(data.rootCause || "");
        setResolution(data.resolution || "");
        setMandaysSpent(data.mandaysSpent ? data.mandaysSpent.toString() : "");
        setMandaysType(data.mandaysType || "HOURS");
        setMandaysCategory(data.mandaysCategory || "CORRECTIVE");
      }
    } catch (error) {
      console.error("Gagal memuat detail tiket", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Gagal memuat daftar kategori", error);
    }
  }

  async function handleClaimTicket() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedToId: session?.user?.id,
          status: "IN_PROGRESS",
        }),
      });

      if (res.ok) {
        await fetchTicket();
        router.refresh();
      }
    } catch (error) {
      console.error("Gagal claim tiket", error);
    } finally {
      setSaving(false);
    }
  }

  // Eksekusi Reject -> Buka Popup Sukses
 // Eksekusi Reject -> Langsung Redirect ke Inbox
  async function executeReject() {
    if (!rejectReason.trim()) {
      setErrorMessage("Alasan reject wajib diisi!");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      const res = await rejectTicket(ticket.id, rejectCategoryId, rejectReason);

      if (res.error) {
        setErrorMessage(res.error);
        setSaving(false);
      } else {
        setShowRejectModal(false);
        
        // Langsung pindahkan user ke Inbox secara otomatis
        router.push(backUrl);
        router.refresh();
      }
    } catch (error: any) {
      console.error("Gagal reject tiket", error);
      setErrorMessage(error.message || "Terjadi kesalahan pada sistem.");
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    setErrorMessage("");

    if (status === "RESOLVED") {
      if (!rootCause.trim() || !resolution.trim()) {
        setErrorMessage(
          "Root Cause Analysis dan Resolution wajib diisi untuk menyelesaikan tiket!"
        );
        return;
      }
      if (!mandaysSpent || Number(mandaysSpent) <= 0) {
        setErrorMessage(
          "Lama pekerjaan (Mandays/Jam) wajib diisi dengan benar!"
        );
        return;
      }
      if (!mandaysCategory) {
        setErrorMessage("Jenis mandays (Corrective/Preventive) wajib dipilih!");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          assignedToId: assignedToId === "unassigned" ? null : assignedToId,
          categoryId: categoryId || null,
          rootCause: rootCause.trim() ? rootCause : null,
          resolution: resolution.trim() ? resolution : null,
          mandaysSpent: mandaysSpent ? Number(mandaysSpent) : 0,
          mandaysType,
          mandaysCategory,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setIsEditing(false);
        await fetchTicket();
        router.refresh();
      } else {
        setErrorMessage(result.error || "Gagal memperbarui tiket.");
      }
    } catch (error) {
      console.error("Gagal update tiket", error);
      setErrorMessage("Terjadi kesalahan pada sistem.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center p-12 bg-destructive/10 rounded-lg border border-destructive/20 mt-6">
          <h2 className="text-xl font-bold text-destructive">
            Tiket Tidak Ditemukan
          </h2>
          <Link href="/tickets">
            <Button variant="outline" className="mt-4">
              Kembali ke Daftar Tiket
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const role = session?.user?.role;
  const backUrl =
    role === "PIC" || role === "PROJECT_MANAGER" ? "/inbox" : "/tickets";
  const backLabel =
    role === "PIC" || role === "PROJECT_MANAGER"
      ? "Back to Inbox"
      : "Back to Tickets";

  const isClosedOrResolved =
    ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  const canEdit =
    (role === "ADMIN" || role === "PROJECT_MANAGER" || role === "PIC") &&
    (!isClosedOrResolved || role === "ADMIN");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-12 relative">
      {/* 1. Modal Form Input Reject */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6 space-y-5 border">
            <div>
              <h3 className="text-lg font-bold flex items-center text-destructive">
                <XCircle className="h-5 w-5 mr-2" /> Reject & Reroute Tiket
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tiket akan dilepaskan dari penugasan Anda dan dikembalikan ke antrean untuk ditinjau oleh Admin.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Ubah Kategori (Jika Diperlukan)</Label>
              <Select
                value={rejectCategoryId}
                onValueChange={setRejectCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kategori Baru" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Alasan Reject <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Berikan alasan mengapa tiket ini ditolak atau salah kategori..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setErrorMessage("");
                }}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={executeReject}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Submit Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Popup Sukses Reject */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background rounded-lg shadow-xl max-w-sm w-full p-6 text-center space-y-4 border">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold">Tiket Berhasil Di-Reject!</h3>
              <p className="text-sm text-muted-foreground">
                Tiket telah dilepaskan dari penugasan Anda dan dikembalikan ke antrean untuk ditinjau oleh Admin.
              </p>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
              onClick={() => {
                setShowSuccessModal(false);
                router.push(backUrl);
                router.refresh();
              }}
            >
              Kembali ke Inbox
            </Button>
          </div>
        </div>
      )}

      {/* Header & Navigasi */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={backUrl}
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> {backLabel}
        </Link>

        <div className="flex items-center gap-2">
          {role === "PIC" &&
            !ticket.assignedToId &&
            !isEditing &&
            !isClosedOrResolved && (
              <Button
                onClick={handleClaimTicket}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Claim Ticket
              </Button>
            )}

          {role === "PROJECT_MANAGER" && !isEditing && !isClosedOrResolved && (
            <NotApplicableButton ticketId={ticket.id} userRole={role} />
          )}

          {/* Tombol Reject -> Buka Modal Form */}
          {(role === "PIC" || role === "PROJECT_MANAGER") &&
            !isEditing &&
            ticket.status !== "RESOLVED" &&
            ticket.status !== "CLOSED" &&
            ticket.status !== "REJECTED" && (
              <Button
                onClick={() => {
                  setRejectCategoryId(ticket.categoryId || "");
                  setRejectReason("");
                  setShowRejectModal(true);
                }}
                variant="destructive"
                size="sm"
                disabled={saving}
              >
                <XCircle className="h-4 w-4 mr-2" /> Reject
              </Button>
            )}

          {canEdit && !isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              <Edit className="h-4 w-4 mr-2" /> Edit Ticket
            </Button>
          )}

          {isEditing && (
            <>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setErrorMessage("");
                }}
                variant="ghost"
                size="sm"
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSaveEdit} size="sm" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {errorMessage && !showRejectModal && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md text-sm font-medium">
          {errorMessage}
        </div>
      )}

      {/* Main Ticket Info Card */}
      <div className="bg-card rounded-lg border shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between border-b pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Hash className="h-4 w-4" />
              <span>
                {ticket.trackingId ||
                  `TICKET-${ticket.id.slice(-6).toUpperCase()}`}
              </span>
              <span className="mx-2">•</span>
              <Clock className="h-4 w-4" />
              <span>{new Date(ticket.createdAt).toLocaleString("id-ID")}</span>
            </div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
          </div>

          <div className="flex flex-col gap-3 items-end">
            {!isEditing && (
              <>
                <Badge
                  variant={
                    ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                      ? "default"
                      : ticket.status === "REJECTED"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-sm"
                >
                  {ticket.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-sm ${
                    ticket.priority === "HIGH"
                      ? "text-red-500 border-red-200 bg-red-50"
                      : ticket.priority === "MEDIUM"
                      ? "text-amber-500 border-amber-200 bg-amber-50"
                      : "text-green-500 border-green-200 bg-green-50"
                  }`}
                >
                  {ticket.priority} Priority
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Form Edit Container */}
        {isEditing && (
          <div className="space-y-4 bg-muted/40 p-4 rounded-lg border">
            <h3 className="font-semibold text-sm">Form Update Tiket</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    {role === "PROJECT_MANAGER" && (
                      <SelectItem value="NOT_APPLICABLE">
                        Not Applicable
                      </SelectItem>
                    )}
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(role === "PIC" || role === "PROJECT_MANAGER" || role === "ADMIN") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-primary">
                    Category (Ubah jika salah)
                  </Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(role === "ADMIN" || role === "PROJECT_MANAGER") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Assign To (PIC)</Label>
                  <Select value={assignedToId} onValueChange={setAssignedToId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih PIC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        Unassigned (Pool)
                      </SelectItem>
                      {ticket.contract?.pics?.map((pic: any) => (
                        <SelectItem key={pic.id} value={pic.id}>
                          {pic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {status === "RESOLVED" && (
              <div className="space-y-4 pt-4 border-t mt-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md text-xs text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ Status diset ke <strong>Resolved</strong>. Mohon lengkapi
                  jenis mandays, jumlah waktu, Root Cause, dan Resolution.
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Jenis Mandays <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={mandaysCategory}
                    onValueChange={setMandaysCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jenis Mandays" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CORRECTIVE">
                        Corrective (Perbaikan/Insiden)
                      </SelectItem>
                      <SelectItem value="PREVENTIVE">
                        Preventive (Pemeliharaan Rutin)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Lama Pekerjaan <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Contoh: 4 (Jam) atau 1 (Mandays)"
                      value={mandaysSpent}
                      onChange={(e) => setMandaysSpent(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Satuan Waktu <span className="text-red-500">*</span>
                    </Label>
                    <Select value={mandaysType} onValueChange={setMandaysType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOURS">Jam (Hours)</SelectItem>
                        <SelectItem value="MANDAYS">
                          Mandays (1 Hari = 8 Jam)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Root Cause Analysis (RCA){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Jelaskan akar penyebab masalah dari tiket ini..."
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Resolution (Penyelesaian){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Jelaskan langkah-langkah atau solusi perbaikan yang telah dilakukan..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Description</h3>
          <div className="bg-muted/30 p-4 rounded-md whitespace-pre-wrap text-sm leading-relaxed border">
            {ticket.description}
          </div>
        </div>

        {(ticket.rootCause || ticket.resolution || ticket.mandaysSpent > 0) &&
          !isEditing && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg flex items-center text-green-600">
                <CheckCircle2 className="h-5 w-5 mr-2" /> Resolution Summary
              </h3>

              {ticket.mandaysSpent > 0 && (
                <div className="bg-primary/5 border rounded-md p-3 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">
                      Jenis:
                    </span>
                    <Badge variant="outline" className="font-semibold">
                      {ticket.mandaysCategory || "CORRECTIVE"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium mr-2">
                      Lama Pengerjaan:
                    </span>
                    <span className="font-bold text-primary">
                      {ticket.mandaysSpent}{" "}
                      {ticket.mandaysType === "MANDAYS" ? "Mandays" : "Jam"}
                      {ticket.mandaysType === "HOURS" &&
                        ` (~${(ticket.mandaysSpent / 8).toFixed(2)} Mandays)`}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/20 border rounded-md p-4 space-y-1.5">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Root Cause Analysis (RCA)
                  </span>
                  <p className="text-sm whitespace-pre-wrap">
                    {ticket.rootCause || "-"}
                  </p>
                </div>
                <div className="bg-muted/20 border rounded-md p-4 space-y-1.5">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    Resolution
                  </span>
                  <p className="text-sm whitespace-pre-wrap">
                    {ticket.resolution || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Info Grid (Customer, Contract, Assignment) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t mt-6">
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center text-sm text-muted-foreground uppercase">
              <Building className="h-4 w-4 mr-2" /> Customer & Contract Info
            </h4>
            <div className="bg-background border rounded-md p-3 text-sm space-y-2">
              <div>
                <p className="font-medium">
                  {ticket.customer?.company || ticket.customer?.name || "-"}
                </p>
                <p className="text-muted-foreground text-xs">
                  Kode: {ticket.customer?.customerCode || "-"}
                </p>
              </div>

              {ticket.contract ? (
                <div className="pt-2 border-t text-xs space-y-1">
                  <p className="text-primary font-medium flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> Kontrak:{" "}
                    {ticket.contract.contractNumber}
                  </p>
                  <div>
                    <span className="text-muted-foreground">PIC Kontrak: </span>
                    {ticket.contract.pics?.length > 0 ? (
                      ticket.contract.pics.map((p: any) => p.name).join(", ")
                    ) : (
                      <span className="italic text-muted-foreground">
                        Tidak ada PIC
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t text-xs text-amber-600 font-medium italic">
                  Tidak terikat kontrak aktif
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center text-sm text-muted-foreground uppercase">
              <User className="h-4 w-4 mr-2" /> Assignment & Team
            </h4>
            <div className="bg-background border rounded-md p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground inline-block w-24">
                  Category:
                </span>{" "}
                <span className="font-semibold text-primary">
                  {ticket.category?.name || "Uncategorized"}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground inline-block w-24">
                  Assigned To:
                </span>
                {ticket.assignedTo ? (
                  <span className="font-medium text-green-600">
                    {ticket.assignedTo.name}
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium italic">
                    Unassigned (Pool)
                  </span>
                )}
              </p>
              {ticket.contract?.projectManager && (
                <p className="text-xs text-muted-foreground pt-1 mt-1 border-t">
                  PM Kontrak: {ticket.contract.projectManager.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}