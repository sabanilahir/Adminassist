"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy,
  setDefaultSlaPolicy,
  getContractsBySlaPolicy,
} from "@/actions/sla-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Loader2,
  FileCheck2,
  HelpCircle,
  FileText,
} from "lucide-react";

export default function SlaPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const canAccessTickets = role === "ADMIN" || role === "ADMIN_TICKET";

  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal Kontrak Terkait
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [selectedPolicyForContracts, setSelectedPolicyForContracts] = useState<any>(null);
  const [associatedContracts, setAssociatedContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  async function handleOpenContractsModal(policy: any) {
    setSelectedPolicyForContracts(policy);
    setContractModalOpen(true);
    setLoadingContracts(true);
    try {
      const contracts = await getContractsBySlaPolicy(policy.id);
      setAssociatedContracts(contracts);
    } catch (err) {
      console.error("Gagal memuat kontrak terkait SLA", err);
      setAssociatedContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  }

  const [form, setForm] = useState({
    name: "",
    description: "",
    criteria: "",
    criteriaHigh: "",
    criteriaMedium: "",
    criteriaLow: "",
    responseHoursHigh: 1,
    resolutionHoursHigh: 4,
    responseHoursMedium: 4,
    resolutionHoursMedium: 24,
    responseHoursLow: 8,
    resolutionHoursLow: 72,
    isDefault: false,
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    setLoading(true);
    try {
      const data = await getSlaPolicies();
      setPolicies(data);
    } catch (err) {
      console.error("Gagal memuat SLA Policies", err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    if (!isAdmin) return;
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      criteria: "",
      criteriaHigh: "Sistem / server utama down total, transaksi bisnis terhenti, data kritis terancam.",
      criteriaMedium: "Modul sekunder terganggu, performa lambat, ada alternatif solusi sementara (workaround).",
      criteriaLow: "Pertanyaan operasional, permohonan informasi teknis, bug kosmetik / tampilan minor.",
      responseHoursHigh: 1,
      resolutionHoursHigh: 4,
      responseHoursMedium: 4,
      resolutionHoursMedium: 24,
      responseHoursLow: 8,
      resolutionHoursLow: 72,
      isDefault: policies.length === 0,
    });
    setErrorMsg("");
    setDialogOpen(true);
  }

  function handleOpenEdit(policy: any) {
    if (!isAdmin) return;
    setEditingId(policy.id);
    setForm({
      name: policy.name,
      description: policy.description || "",
      criteria: policy.criteria || "",
      criteriaHigh: policy.criteriaHigh || "",
      criteriaMedium: policy.criteriaMedium || "",
      criteriaLow: policy.criteriaLow || "",
      responseHoursHigh: policy.responseHoursHigh,
      resolutionHoursHigh: policy.resolutionHoursHigh,
      responseHoursMedium: policy.responseHoursMedium,
      resolutionHoursMedium: policy.resolutionHoursMedium,
      responseHoursLow: policy.responseHoursLow,
      resolutionHoursLow: policy.resolutionHoursLow,
      isDefault: policy.isDefault,
    });
    setErrorMsg("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setErrorMsg("");
    setSaving(true);

    try {
      if (editingId) {
        const res = await updateSlaPolicy(editingId, form);
        if (res.error) {
          setErrorMsg(res.error);
          setSaving(false);
          return;
        }
      } else {
        const res = await createSlaPolicy(form);
        if (res.error) {
          setErrorMsg(res.error);
          setSaving(false);
          return;
        }
      }

      setDialogOpen(false);
      await fetchPolicies();
    } catch (err) {
      setErrorMsg("Terjadi kegagalan komunikasi dengan server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    if (!confirm("Apakah Anda yakin ingin menghapus kebijakan SLA ini?")) return;

    const res = await deleteSlaPolicy(id);
    if (res.error) {
      alert(res.error);
      return;
    }
    await fetchPolicies();
  }

  async function handleSetDefault(id: string) {
    if (!isAdmin) return;
    const res = await setDefaultSlaPolicy(id);
    if (res.error) {
      alert(res.error);
      return;
    }
    await fetchPolicies();
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={canAccessTickets ? "/tickets" : "/"}
            className="flex items-center text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            {canAccessTickets ? "Kembali ke Tickets" : "Kembali ke Dashboard"}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            {isAdmin ? "Master Service Level Agreement (SLA)" : "Katalog Kebijakan SLA (Service Level Agreement)"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Konfigurasi target waktu resolusi, respon, dan kriteria klasifikasi issue per prioritas untuk Kontrak Customer."
              : "Informasi standar target waktu respon, resolusi, dan kriteria klasifikasi issue per prioritas pada tiket helpdesk."}
          </p>
        </div>

        {isAdmin && (
          <Button onClick={handleOpenCreate} className="bg-slate-900 text-white hover:bg-slate-800 shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Tambah SLA Policy
          </Button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : policies.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium text-foreground">Belum ada kebijakan SLA</p>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Tambahkan SLA pertama untuk mulai mengaitkannya ke kontrak customer."
                : "Belum ada kebijakan SLA yang dikonfigurasikan di sistem."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-3.5 w-60">Nama & Cakupan</th>
                  <th className="px-4 py-3.5 text-center w-52">Target Waktu Resolusi</th>
                  <th className="px-5 py-3.5">Kriteria SLA (Keterangan Kasus / Issue)</th>
                  <th className="px-4 py-3.5 text-center w-32">Kontrak</th>
                  {isAdmin && <th className="px-5 py-3.5 text-right w-36">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Nama & Deskripsi */}
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{policy.name}</span>
                        {policy.isDefault && (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs shrink-0">
                            Default
                          </Badge>
                        )}
                      </div>
                      {policy.description && (
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          {policy.description}
                        </p>
                      )}
                    </td>

                    {/* Target Waktu */}
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between bg-red-50/60 px-2 py-1 rounded border border-red-100">
                          <span className="font-bold text-red-700">HIGH</span>
                          <span className="text-slate-800 font-semibold">{policy.resolutionHoursHigh}j Resolve</span>
                        </div>
                        <div className="flex items-center justify-between bg-amber-50/60 px-2 py-1 rounded border border-amber-100">
                          <span className="font-bold text-amber-700">MED</span>
                          <span className="text-slate-800 font-semibold">{policy.resolutionHoursMedium}j Resolve</span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          <span className="font-bold text-slate-700">LOW</span>
                          <span className="text-slate-800 font-semibold">{policy.resolutionHoursLow}j Resolve</span>
                        </div>
                      </div>
                    </td>

                    {/* Kolom Kriteria SLA (Keterangan Issue) */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-2 text-xs">
                        {policy.criteriaHigh && (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-red-600 block">Kriteria HIGH:</span>
                            <p className="text-slate-700 leading-relaxed bg-slate-50 p-1.5 rounded border border-slate-100">
                              {policy.criteriaHigh}
                            </p>
                          </div>
                        )}
                        {policy.criteriaMedium && (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-amber-600 block">Kriteria MEDIUM:</span>
                            <p className="text-slate-700 leading-relaxed bg-slate-50 p-1.5 rounded border border-slate-100">
                              {policy.criteriaMedium}
                            </p>
                          </div>
                        )}
                        {policy.criteriaLow && (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-700 block">Kriteria LOW:</span>
                            <p className="text-slate-700 leading-relaxed bg-slate-50 p-1.5 rounded border border-slate-100">
                              {policy.criteriaLow}
                            </p>
                          </div>
                        )}
                        {!policy.criteriaHigh && !policy.criteriaMedium && !policy.criteriaLow && (
                          <div className="text-slate-400 italic text-[11px] py-1">
                            {policy.criteria || "Belum ada rincian kriteria issue."}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Terkait Kontrak (Clickable) */}
                    <td className="px-4 py-4 text-center align-top">
                      <button
                        type="button"
                        onClick={() => handleOpenContractsModal(policy)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors border border-slate-200/80 cursor-pointer shadow-xs group"
                        title="Klik untuk melihat daftar rincian kontrak yang menggunakan kebijakan SLA ini"
                      >
                        <FileCheck2 className="h-3.5 w-3.5 text-slate-500 group-hover:text-primary transition-colors" />
                        <span className="font-semibold underline decoration-slate-300 underline-offset-2">
                          {policy._count?.contracts || 0} Kontrak
                        </span>
                      </button>
                    </td>

                    {/* Aksi (Khusus Sistem Administrator) */}
                    {isAdmin && (
                      <td className="px-5 py-4 text-right align-top">
                        <div className="flex flex-col gap-1 items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                            onClick={() => handleOpenEdit(policy)}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit SLA
                          </Button>
                          {!policy.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-slate-500 hover:text-emerald-600"
                              onClick={() => handleSetDefault(policy.id)}
                              title="Tetapkan sebagai Default"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Set Default
                            </Button>
                          )}
                          {!policy.isDefault && (policy._count?.contracts || 0) === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(policy.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Create/Edit (Khusus Sistem Administrator) */}
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Kebijakan & Kriteria SLA" : "Tambah Kebijakan SLA Baru"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                  {errorMsg}
                </div>
              )}

              {/* Nama Kebijakan */}
              <div className="space-y-1.5">
                <Label htmlFor="sla-name" className="text-xs font-semibold">
                  Nama Kebijakan SLA <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sla-name"
                  placeholder="Contoh: Premium 24/7 SLA, Gold SLA, Standard 8x5"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label htmlFor="sla-desc" className="text-xs font-semibold">
                  Deskripsi / Cakupan Kontrak
                </Label>
                <Input
                  id="sla-desc"
                  placeholder="Contoh: Berlaku untuk kontrak maintenance priority enterprise"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Grid Target Waktu */}
              <div className="border rounded-md p-3.5 bg-slate-50/60 space-y-3">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Target Waktu (Dalam Satuan Jam)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {/* HIGH */}
                  <div className="space-y-1 p-2 bg-red-50/50 rounded border border-red-100">
                    <span className="text-xs font-bold text-red-700">HIGH Priority</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Respon (Jam)</span>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs bg-white"
                          value={form.responseHoursHigh}
                          onChange={(e) => setForm({ ...form, responseHoursHigh: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Resolusi (Jam)</span>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs bg-white"
                          value={form.resolutionHoursHigh}
                          onChange={(e) => setForm({ ...form, resolutionHoursHigh: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* MEDIUM */}
                  <div className="space-y-1 p-2 bg-amber-50/50 rounded border border-amber-100">
                    <span className="text-xs font-bold text-amber-700">MEDIUM Priority</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Respon (Jam)</span>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs bg-white"
                          value={form.responseHoursMedium}
                          onChange={(e) => setForm({ ...form, responseHoursMedium: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Resolusi (Jam)</span>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs bg-white"
                          value={form.resolutionHoursMedium}
                          onChange={(e) => setForm({ ...form, resolutionHoursMedium: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* LOW */}
                  <div className="col-span-2 space-y-1 p-2 bg-slate-100/60 rounded border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">LOW Priority</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Respon (Jam)</span>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs bg-white"
                          value={form.responseHoursLow}
                          onChange={(e) => setForm({ ...form, responseHoursLow: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Resolusi (Jam)</span>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs bg-white"
                          value={form.resolutionHoursLow}
                          onChange={(e) => setForm({ ...form, resolutionHoursLow: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kriteria SLA Per Tingkatan */}
              <div className="border rounded-md p-3.5 bg-slate-50/60 space-y-3">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                    Kriteria SLA (Keterangan Issue / Masalah)
                  </p>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tuliskan panduan jenis insiden yang masuk ke dalam tiap level agar customer dan teknisi memiliki pemahaman yang selaras.
                </p>

                {/* Kriteria HIGH */}
                <div className="space-y-1">
                  <Label htmlFor="crit-high" className="text-xs font-semibold text-red-700">
                    Kriteria Prioritas HIGH:
                  </Label>
                  <Textarea
                    id="crit-high"
                    rows={2}
                    className="text-xs bg-white"
                    placeholder="Contoh: Server utama down, transaksi terhenti, data kritis terancam, tidak ada solusi sementara."
                    value={form.criteriaHigh}
                    onChange={(e) => setForm({ ...form, criteriaHigh: e.target.value })}
                  />
                </div>

                {/* Kriteria MEDIUM */}
                <div className="space-y-1">
                  <Label htmlFor="crit-med" className="text-xs font-semibold text-amber-700">
                    Kriteria Prioritas MEDIUM:
                  </Label>
                  <Textarea
                    id="crit-med"
                    rows={2}
                    className="text-xs bg-white"
                    placeholder="Contoh: Sebagian modul tidak berfungsi, sistem lambat namun transaksi masih dapat berjalan dengan workaround."
                    value={form.criteriaMedium}
                    onChange={(e) => setForm({ ...form, criteriaMedium: e.target.value })}
                  />
                </div>

                {/* Kriteria LOW */}
                <div className="space-y-1">
                  <Label htmlFor="crit-low" className="text-xs font-semibold text-slate-700">
                    Kriteria Prioritas LOW:
                  </Label>
                  <Textarea
                    id="crit-low"
                    rows={2}
                    className="text-xs bg-white"
                    placeholder="Contoh: Pertanyaan operasional, permintaan data / informasi, keluhan minor yang tidak mengganggu alur kerja."
                    value={form.criteriaLow}
                    onChange={(e) => setForm({ ...form, criteriaLow: e.target.value })}
                  />
                </div>

                {/* Kriteria Jam Operasional */}
                <div className="space-y-1 pt-1">
                  <Label htmlFor="crit-general" className="text-xs font-semibold text-slate-600">
                    Catatan Jam Layanan / Ketentuan Tambahan:
                  </Label>
                  <Input
                    id="crit-general"
                    className="text-xs bg-white"
                    placeholder="Contoh: Berlaku 8x5 hari kerja (08:30 - 17:30 WIB) tidak termasuk libur nasional."
                    value={form.criteria}
                    onChange={(e) => setForm({ ...form, criteria: e.target.value })}
                  />
                </div>
              </div>

              {/* Set Default Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sla-is-default"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <Label htmlFor="sla-is-default" className="text-xs font-medium cursor-pointer">
                  Jadikan sebagai kebijakan SLA Default sistem
                </Label>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {editingId ? "Simpan Perubahan" : "Buat Kebijakan SLA"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Page / Dialog Daftar Kontrak Terkait */}
      <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Daftar Kontrak — {selectedPolicyForContracts?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPolicyForContracts?.isDefault
                ? "Menampilkan kontrak yang memilih kebijakan ini secara spesifik maupun yang menggunakan default sistem (tanpa custom SLA)."
                : `Menampilkan semua kontrak customer yang terhubung secara spesifik dengan kebijakan ${selectedPolicyForContracts?.name}.`}
            </p>
          </DialogHeader>

          <div className="py-2">
            {loadingContracts ? (
              <div className="flex h-44 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : associatedContracts.length === 0 ? (
              <div className="p-8 text-center space-y-2 border rounded-lg bg-slate-50/50">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium text-slate-800">Belum ada kontrak yang menggunakan SLA ini</p>
                <p className="text-xs text-slate-500">
                  {isAdmin
                    ? "Anda dapat mengaitkan SLA ini melalui form Edit Kontrak pada menu Contracts."
                    : "Belum ada kontrak aktif yang terdaftar menggunakan kebijakan ini."}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-3">No. Kontrak</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Project Manager</th>
                      <th className="px-4 py-3">Periode Kontrak</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {associatedContracts.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {c.contractNumber || "Tanpa Nomor"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 block">{c.customer?.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{c.customer?.customerCode}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {c.projectManager?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {c.startDate ? new Date(c.startDate).toLocaleDateString("id-ID") : "-"} s/d{" "}
                          {c.endDate ? new Date(c.endDate).toLocaleDateString("id-ID") : "-"}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <Link
                              href="/admin/contracts"
                              className="text-primary hover:underline font-semibold"
                              onClick={() => setContractModalOpen(false)}
                            >
                              Buka Kontrak
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Total {associatedContracts.length} kontrak terikat
            </span>
            <Button variant="outline" size="sm" onClick={() => setContractModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
