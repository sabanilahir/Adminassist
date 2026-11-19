"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Upload,
  RotateCcw,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  ImageIcon,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface BrandingState {
  appName: string;
  appDescription: string;
  loginLayout: "horizontal" | "stacked";
  logoLightUrl: string;
  logoDarkUrl: string;
  hasCustomLight: boolean;
  hasCustomDark: boolean;
}

export default function BrandingSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const [branding, setBranding] = useState<BrandingState>({
    appName: "ASSIST",
    appDescription: "Astragraphia Solution Support System Ticketing",
    loginLayout: "horizontal",
    logoLightUrl: "/images/branding/logo-horizontal-light.png",
    logoDarkUrl: "/images/branding/logo-horizontal-dark.png",
    hasCustomLight: false,
    hasCustomDark: false,
  });

  // Local file previews for unsaved changes
  const [lightFile, setLightFile] = useState<File | null>(null);
  const [lightPreview, setLightPreview] = useState<string | null>(null);
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [darkPreview, setDarkPreview] = useState<string | null>(null);

  const lightInputRef = useRef<HTMLInputElement>(null);
  const darkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) return;
    if ((session.user as any)?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchBranding();
  }, [session, router]);

  async function fetchBranding() {
    try {
      const res = await fetch("/api/settings/branding");
      if (res.ok) {
        const data = await res.json();
        setBranding({
          appName: data.appName || "ASSIST",
          appDescription:
            data.appDescription ||
            "Astragraphia Solution Support System Ticketing",
          loginLayout: data.loginLayout || "horizontal",
          logoLightUrl:
            data.logoLightUrl || "/images/branding/logo-horizontal-light.png",
          logoDarkUrl:
            data.logoDarkUrl || "/images/branding/logo-horizontal-dark.png",
          hasCustomLight: Boolean(data.hasCustomLight),
          hasCustomDark: Boolean(data.hasCustomDark),
        });
      }
    } catch (error) {
      console.error("Gagal mengambil konfigurasi branding:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleLightFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Terlalu Besar",
          description: "Ukuran file logo maksimal adalah 2 MB.",
          variant: "destructive",
        });
        return;
      }
      setLightFile(file);
      setLightPreview(URL.createObjectURL(file));
    }
  }

  function handleDarkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Terlalu Besar",
          description: "Ukuran file logo maksimal adalah 2 MB.",
          variant: "destructive",
        });
        return;
      }
      setDarkFile(file);
      setDarkPreview(URL.createObjectURL(file));
    }
  }

  async function handleReset(target: "light" | "dark" | "all") {
    setResetting(target);
    try {
      const res = await fetch(`/api/settings/branding?target=${target}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (target === "light" || target === "all") {
          setLightFile(null);
          setLightPreview(null);
          if (lightInputRef.current) lightInputRef.current.value = "";
        }
        if (target === "dark" || target === "all") {
          setDarkFile(null);
          setDarkPreview(null);
          if (darkInputRef.current) darkInputRef.current.value = "";
        }

        await fetchBranding();
        toast({
          title: "Logo Berhasil Direset",
          description: "Logo telah dikembalikan ke standar bawaan sistem.",
        });
      } else {
        const err = await res.json();
        throw new Error(err.error || "Gagal mereset logo.");
      }
    } catch (err: any) {
      toast({
        title: "Gagal Mereset",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setResetting(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("appName", branding.appName);
      formData.append("appDescription", branding.appDescription);
      formData.append("loginLayout", branding.loginLayout);

      if (lightFile) {
        formData.append("logoLight", lightFile);
      }
      if (darkFile) {
        formData.append("logoDark", darkFile);
      }

      const res = await fetch("/api/settings/branding", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast({
          title: "Perubahan Disimpan",
          description: "Konfigurasi branding & logo berhasil diperbarui.",
        });
        setLightFile(null);
        setLightPreview(null);
        setDarkFile(null);
        setDarkPreview(null);
        await fetchBranding();
        router.refresh();
      } else {
        throw new Error(result.error || "Gagal menyimpan konfigurasi.");
      }
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  // Active display URLs
  const activeLightUrl =
    lightPreview ||
    branding.logoLightUrl ||
    "/images/branding/logo-horizontal-light.png";
  const activeDarkUrl =
    darkPreview ||
    branding.logoDarkUrl ||
    "/images/branding/logo-horizontal-dark.png";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Three-Zone Header Architecture */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Branding & Logo Sistem
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur logo aplikasi untuk halaman login dan header dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(branding.hasCustomLight || branding.hasCustomDark) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleReset("all")}
              disabled={resetting !== null || saving}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset Semua ke Bawaan
            </Button>
          )}
          <Button
            type="submit"
            form="branding-form"
            size="sm"
            disabled={saving}
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 px-4 font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </div>

      <form id="branding-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Sistem */}
        <Card className="border-slate-200/80 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Identitas Aplikasi
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Nama dan deskripsi resmi yang ditampilkan pada sistem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="appName" className="text-xs font-medium text-slate-700">
                  Nama Aplikasi
                </Label>
                <Input
                  id="appName"
                  value={branding.appName}
                  onChange={(e) =>
                    setBranding((prev) => ({ ...prev, appName: e.target.value }))
                  }
                  className="h-9 text-xs"
                  placeholder="ASSIST"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="loginLayout"
                  className="text-xs font-medium text-slate-700"
                >
                  Gaya Logo Halaman Login (Saat Menggunakan Logo Bawaan)
                </Label>
                <select
                  id="loginLayout"
                  value={branding.loginLayout}
                  onChange={(e) =>
                    setBranding((prev) => ({
                      ...prev,
                      loginLayout: e.target.value as "horizontal" | "stacked",
                    }))
                  }
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="horizontal">Horizontal (Standar Modern)</option>
                  <option value="stacked">Vertikal / Stacked (Ikon Atas)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="appDescription"
                className="text-xs font-medium text-slate-700"
              >
                Keterangan Singkat Sistem
              </Label>
              <Input
                id="appDescription"
                value={branding.appDescription}
                onChange={(e) =>
                  setBranding((prev) => ({
                    ...prev,
                    appDescription: e.target.value,
                  }))
                }
                className="h-9 text-xs"
                placeholder="Astragraphia Solution Support System Ticketing"
              />
            </div>
          </CardContent>
        </Card>

        {/* Upload Logo: Mode Terang & Mode Gelap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Logo Mode Terang */}
          <Card className="border-slate-200/80 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Logo Mode Terang (Light)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Ditampilkan pada latar belakang putih/terang.
                  </CardDescription>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {branding.hasCustomLight ? "Kustom" : "Bawaan"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview Box Light */}
              <div className="h-32 border border-slate-200 rounded-md bg-white flex items-center justify-center p-4 relative group">
                <img
                  src={activeLightUrl}
                  alt="Preview Logo Terang"
                  className="max-h-20 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={lightInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLightFileChange}
                  className="hidden"
                  id="light-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => lightInputRef.current?.click()}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8 flex-1"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Pilih File Baru
                </Button>
                {branding.hasCustomLight && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset("light")}
                    disabled={resetting !== null}
                    className="text-slate-600 hover:bg-slate-100 text-xs h-8"
                    title="Reset ke logo bawaan"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Disarankan PNG transparan atau SVG horizontal. Maks 2 MB.
              </p>
            </CardContent>
          </Card>

          {/* Logo Mode Gelap */}
          <Card className="border-slate-200/80 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Logo Mode Gelap (Dark)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Ditampilkan pada latar belakang gelap (dark theme).
                  </CardDescription>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  {branding.hasCustomDark ? "Kustom" : "Bawaan"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview Box Dark */}
              <div className="h-32 border border-slate-700 rounded-md bg-slate-900 flex items-center justify-center p-4 relative group">
                <img
                  src={activeDarkUrl}
                  alt="Preview Logo Gelap"
                  className="max-h-20 w-auto object-contain transition-transform group-hover:scale-105"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={darkInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleDarkFileChange}
                  className="hidden"
                  id="dark-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => darkInputRef.current?.click()}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs h-8 flex-1"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Pilih File Baru
                </Button>
                {branding.hasCustomDark && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset("dark")}
                    disabled={resetting !== null}
                    className="text-slate-600 hover:bg-slate-100 text-xs h-8"
                    title="Reset ke logo bawaan"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Disarankan warna teks putih / kontras tinggi dengan latar gelap.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Simulator */}
        <Card className="border-slate-200/80 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-slate-700" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Simulasi Pratinjau Tampilan Sistem
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Lihat bagaimana logo tampil di Header Dashboard dan Halaman Login secara langsung.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Header Preview Bar */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                1. Tampilan pada Bar Header (Tinggi 56px / h-14)
              </span>
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3 px-3">
                  <img
                    src={activeLightUrl}
                    alt="Logo Header Light"
                    className="h-8 max-h-8 w-auto object-contain"
                  />
                </div>
                <div className="flex items-center gap-2 pr-3">
                  <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                    ☀️
                  </div>
                </div>
              </div>
            </div>

            {/* Login Card Preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500">
                2. Tampilan pada Kartu Login (Hanya Gambar Logo)
              </span>
              <div className="border border-slate-200 rounded-lg p-6 bg-slate-100 flex justify-center">
                <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-center space-y-4">
                  <div className="flex justify-center items-center">
                    <img
                      src={
                        branding.loginLayout === "stacked" && !lightPreview && !branding.hasCustomLight
                          ? "/images/branding/logo-stacked-light.png"
                          : activeLightUrl
                      }
                      alt="Logo Login"
                      className={`w-auto max-w-[240px] object-contain ${
                        branding.loginLayout === "stacked" && !lightPreview && !branding.hasCustomLight
                          ? "h-20"
                          : "h-14"
                      }`}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Sign in to your account
                  </p>
                  <div className="h-8 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[11px] text-slate-400">
                    Form input & tombol login...
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
