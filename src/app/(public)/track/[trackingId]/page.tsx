"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Calendar,
  Building,
  Paperclip,
} from "lucide-react";
import { STATUS_LABELS_USER } from "@/types";

export default function PublicTicketTrackingPage() {
  const params = useParams();
  const trackingId = params?.trackingId as string;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);

  useEffect(() => {
    if (trackingId) fetchTicket();
  }, [trackingId]);

  async function fetchTicket() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/track/${trackingId}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Tiket tidak ditemukan.");
      }
    } catch {
      setErrorMsg("Gagal menghubungi server. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmResolution() {
    if (!confirm("Apakah Anda puas dengan penyelesaian masalah pada tiket ini?")) return;

    setConfirming(true);
    try {
      const res = await fetch(`/api/track/${trackingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Dikonfirmasi langsung oleh customer via portal publik" }),
      });

      if (res.ok) {
        setConfirmedSuccess(true);
        await fetchTicket();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal mengonfirmasi tiket.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (errorMsg || !ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4">
        <div className="bg-white border rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Tiket Tidak Ditemukan</h2>
          <p className="text-sm text-slate-500">{errorMsg}</p>
          <Link href="/track">
            <Button variant="outline" className="mt-2 text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Kembali ke Pencarian
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const friendlyStatus = STATUS_LABELS_USER[ticket.status] || ticket.status;
  const isResolved = ticket.status === "RESOLVED";
  const isConfirmed = ticket.status === "CONFIRMED" || ticket.status === "CLOSED";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b bg-white py-3.5 px-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/track"
            className="flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Cari Tiket Lain
          </Link>
          <span className="font-mono text-xs text-slate-400 font-semibold tracking-wider">
            {ticket.trackingId}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1 space-y-6">
        {confirmedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Terima kasih! Anda telah mengonfirmasi penyelesaian tiket ini.</span>
          </div>
        )}

        {/* Title & Status Card */}
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs text-slate-500 font-medium">{ticket.trackingId}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{ticket.category?.name || "General"}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {ticket.title}
              </h1>
            </div>

            <div className="shrink-0">
              <Badge
                variant="outline"
                className={`text-xs px-3 py-1 font-semibold ${
                  isConfirmed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isResolved
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {friendlyStatus}
              </Badge>
            </div>
          </div>

          {/* Key-Value Details Grid */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div>
              <dt className="text-xs text-slate-500 font-medium">Customer</dt>
              <dd className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                {ticket.customer?.company || ticket.customer?.name || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Tanggal Lapor</dt>
              <dd className="text-sm font-semibold text-slate-900 mt-0.5">
                {ticket.reportedAt ? new Date(ticket.reportedAt).toLocaleDateString("id-ID") : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Target SLA Resolusi</dt>
              <dd className="text-sm font-semibold text-amber-600 mt-0.5">
                {ticket.dueDate
                  ? new Date(ticket.dueDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Standar 24 Jam"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 font-medium">Prioritas</dt>
              <dd className="text-sm font-semibold text-slate-900 mt-0.5">{ticket.priority}</dd>
            </div>
          </dl>

          {/* Description */}
          <div className="pt-3 border-t">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Deskripsi Pengaduan
            </span>
            <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </div>
          </div>

          {/* Attachments (if any) */}
          {ticket.attachments?.length > 0 && (
            <div className="pt-2 border-t">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Lampiran File ({ticket.attachments.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ticket.attachments.map((url: string, idx: number) => {
                  const filename = url.split("/").pop() || `File ${idx + 1}`;
                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-2.5 bg-slate-50 hover:bg-slate-100 border rounded-lg text-xs font-medium text-slate-700 transition-colors"
                    >
                      <Paperclip className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      <span className="truncate">{filename}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Resolution Card (Visible if Resolved or Confirmed) */}
        {ticket.resolution && (
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Solusi Penyelesaian dari Tim Dukungan Teknis</span>
            </div>
            <div className="p-4 bg-white border border-emerald-100 rounded-lg text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {ticket.resolution}
            </div>

            {/* Action Konfirmasi untuk Customer */}
            {isResolved && (
              <div className="pt-3 border-t border-emerald-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-emerald-700">
                  Apakah masalah Anda telah terselesaikan dengan baik? Mohon konfirmasi kepuasan Anda.
                </p>
                <Button
                  onClick={handleConfirmResolution}
                  disabled={confirming}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 px-4 shrink-0"
                >
                  {confirming && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Konfirmasi Selesai
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Timeline Aktivitas Tiket */}
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" /> Riwayat Progres Penanganan
          </h2>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {ticket.activities?.length > 0 ? (
              ticket.activities.map((act: any) => (
                <div key={act.id} className="relative space-y-1">
                  <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-slate-900 border-2 border-white" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      {STATUS_LABELS_USER[act.toState] || act.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(act.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {act.note && <p className="text-xs text-slate-600">{act.note}</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada riwayat aktivitas.</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4 text-center text-xs text-slate-400">
        ASSIST Self-Service Portal &copy; {new Date().getFullYear()} Astragraphia
      </footer>
    </div>
  );
}
