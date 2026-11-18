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
} from "lucide-react";

export default function SlaManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (!form.name.trim()) {
      setErrorMsg("Nama kebijakan SLA wajib diisi.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      let res;
      if (editingId) {
        res = await updateSlaPolicy(editingId, form);
      } else {
        res = await createSlaPolicy(form);
      }

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setDialogOpen(false);
        await fetchPolicies();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus kebijakan SLA ini?")) return;
    const res = await deleteSlaPolicy(id);
    if (res.error) {
      alert(res.error);
    } else {
      await fetchPolicies();
    }
  }

  async function handleSetDefault(id: string) {
    const res = await setDefaultSlaPolicy(id);
    if (res.error) {
      alert(res.error);
    } else {
      await fetchPolicies();
    }
  }

  const role = session?.user?.role;
  const isAuthorized = role === "ADMIN" || role === "ADMIN_TICKET";

  if (!isAuthorized && !loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Hanya Admin yang berwenang mengakses halaman manajemen SLA.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/settings"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali ke Settings
          </Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" /> Master Service Level Agreement (SLA)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi target waktu resolusi, respon, dan kriteria klasifikasi issue per prioritas untuk Kontrak Customer.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" /> Tambah SLA Policy
        </Button>
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
              Tambahkan SLA pertama untuk mulai mengaitkannya ke kontrak customer.
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
                  <th className="px-5 py-3.5 text-right w-36">Aksi</th>
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

                    {/* Terkait Kontrak */}
                    <td className="px-4 py-4 text-center align-top">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium mt-1">
                        <FileCheck2 className="h-3.5 w-3.5 text-slate-400" />
                        {policy._count?.contracts || 0} Kontrak
                      </span>
                    </td>

                    {/* Aksi */}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dialog Create/Edit */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Nama Kebijakan SLA <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Contoh: Gold SLA 24/7 atau SLA Suzuki"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cakupan / Deskripsi Singkat</Label>
                <Input
                  placeholder="Contoh: SLA untuk seluruh sistem backend & database"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            {/* Target Waktu */}
            <div className="border rounded-md p-3.5 space-y-3 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block">
                1. Target Waktu Resolusi & Respon (Jam Kerja)
              </span>

              {/* High */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <Label className="text-xs text-red-600 font-semibold">HIGH Resolusi (Jam)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.resolutionHoursHigh}
                    onChange={(e) =>
                      setForm({ ...form, resolutionHoursHigh: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">HIGH Respon (Jam)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.responseHoursHigh}
                    onChange={(e) =>
                      setForm({ ...form, responseHoursHigh: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* Medium */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-600 font-semibold">MEDIUM Resolusi (Jam)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.resolutionHoursMedium}
                    onChange={(e) =>
                      setForm({ ...form, resolutionHoursMedium: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">MEDIUM Respon (Jam)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.responseHoursMedium}
                    onChange={(e) =>
                      setForm({ ...form, responseHoursMedium: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* Low */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">LOW Resolusi (Jam)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.resolutionHoursLow}
                    onChange={(e) =>
                      setForm({ ...form, resolutionHoursLow: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">LOW Respon (Jam)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.responseHoursLow}
                    onChange={(e) =>
                      setForm({ ...form, responseHoursLow: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Bagian Kriteria SLA (Keterangan Issue per Kriteria) */}
            <div className="border rounded-md p-3.5 space-y-3 bg-white">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block">
                2. Kriteria Kasus / Laporan Masuk (Kriteria SLA)
              </span>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  Kriteria Kasus Prioritas HIGH <span className="text-slate-400 font-normal">(Kritis)</span>
                </Label>
                <Textarea
                  placeholder="Contoh: Server/layanan utama down total, transaksi finansial gagal, kebocoran data, tidak ada alternatif operasional..."
                  value={form.criteriaHigh}
                  onChange={(e) => setForm({ ...form, criteriaHigh: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                  Kriteria Kasus Prioritas MEDIUM <span className="text-slate-400 font-normal">(Sedang)</span>
                </Label>
                <Textarea
                  placeholder="Contoh: Modul non-kritis mengalami error, penurunan performa sistem, kendala parsial yang memiliki alternatif solusi sementara..."
                  value={form.criteriaMedium}
                  onChange={(e) => setForm({ ...form, criteriaMedium: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  Kriteria Kasus Prioritas LOW <span className="text-slate-400 font-normal">(Rendah / Minor)</span>
                </Label>
                <Textarea
                  placeholder="Contoh: Permintaan informasi teknis, pertanyaan panduan penggunaan, perbaikan tata letak/UI kosmetik minor..."
                  value={form.criteriaLow}
                  onChange={(e) => setForm({ ...form, criteriaLow: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-slate-600">
                  Catatan / Ketentuan Umum Tambahan (Opsional)
                </Label>
                <Input
                  placeholder="Contoh: Jam kerja dihitung Senin - Jumat 08:30 s/d 17:30 WIB"
                  value={form.criteria}
                  onChange={(e) => setForm({ ...form, criteria: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <Label htmlFor="isDefault" className="text-xs text-slate-700 cursor-pointer">
                Jadikan kebijakan default sistem (berlaku otomatis jika kontrak tidak menentukan SLA khusus)
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? "Simpan Perubahan SLA" : "Buat SLA Policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
