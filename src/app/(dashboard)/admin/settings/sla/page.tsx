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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
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
            Konfigurasi target resolusi dan respon per prioritas tiket yang berkorelasi dengan Kontrak Customer.
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
                  <th className="px-5 py-3.5">Nama & Deskripsi</th>
                  <th className="px-4 py-3.5 text-center">Prioritas HIGH</th>
                  <th className="px-4 py-3.5 text-center">Prioritas MEDIUM</th>
                  <th className="px-4 py-3.5 text-center">Prioritas LOW</th>
                  <th className="px-4 py-3.5 text-center">Terkait Kontrak</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{policy.name}</span>
                        {policy.isDefault && (
                          <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      {policy.description && (
                        <p className="text-xs text-slate-500 mt-1 max-w-sm line-clamp-1">
                          {policy.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-block text-xs font-mono">
                        <span className="font-semibold text-red-600">{policy.resolutionHoursHigh}j Resolve</span>
                        <div className="text-slate-400">({policy.responseHoursHigh}j Respon)</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-block text-xs font-mono">
                        <span className="font-semibold text-amber-600">{policy.resolutionHoursMedium}j Resolve</span>
                        <div className="text-slate-400">({policy.responseHoursMedium}j Respon)</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-block text-xs font-mono">
                        <span className="font-semibold text-slate-700">{policy.resolutionHoursLow}j Resolve</span>
                        <div className="text-slate-400">({policy.responseHoursLow}j Respon)</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <FileCheck2 className="h-3.5 w-3.5 text-slate-400" />
                        {policy._count.contracts} Kontrak
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!policy.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-slate-600 hover:text-emerald-600"
                            onClick={() => handleSetDefault(policy.id)}
                            title="Tetapkan sebagai Default"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                          onClick={() => handleOpenEdit(policy)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        {!policy.isDefault && policy._count.contracts === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(policy.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Kebijakan SLA" : "Tambah Kebijakan SLA Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {errorMsg}
              </div>
            )}

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
              <Label className="text-xs font-semibold">Deskripsi</Label>
              <Textarea
                placeholder="Penjelasan cakupan atau ketentuan SLA..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="border rounded-md p-3.5 space-y-3 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block">
                Target Waktu (Dalam Jam Kerja)
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

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <Label htmlFor="isDefault" className="text-xs text-slate-700 cursor-pointer">
                Jadikan kebijakan default (digunakan otomatis jika kontrak tidak menentukan SLA)
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
                {editingId ? "Simpan Perubahan" : "Buat SLA Policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
