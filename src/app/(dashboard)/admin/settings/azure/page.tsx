"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Save,
  Shield,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function AzureSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const [copiedUri, setCopiedUri] = useState(false);

  const [config, setConfig] = useState({
    clientId: "",
    clientSecret: "",
    tenantId: "",
    isEnabled: false,
    hasSecret: false,
  });

  const [appOrigin, setAppOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    if ((session.user as any).role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchConfig();
  }, [session, router]);

  async function fetchConfig() {
    try {
      const res = await fetch("/api/settings/oauth");
      if (res.ok) {
        const data = await res.json();
        setConfig({
          clientId: data.clientId || "",
          clientSecret: data.clientSecret || "",
          tenantId: data.tenantId || "",
          isEnabled: data.isEnabled || false,
          hasSecret: Boolean(data.hasSecret),
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/settings/oauth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast({
          title: "Pengaturan tersimpan",
          description: "Konfigurasi Azure 365 berhasil diperbarui.",
        });
        fetchConfig();
      } else {
        throw new Error("Gagal menyimpan konfigurasi");
      }
    } catch (error: any) {
      toast({
        title: "Gagal menyimpan",
        description: error.message || "Terjadi kesalahan saat menyimpan pengaturan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/settings/oauth/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: config.tenantId,
          clientId: config.clientId,
          clientSecret: config.clientSecret.includes("••••") ? "" : config.clientSecret,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message,
        });
      } else {
        setTestResult({
          success: false,
          error: data.error || "Gagal menghubungkan ke Azure 365.",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: "Gagal memproses pengujian koneksi ke server.",
      });
    } finally {
      setTesting(false);
    }
  }

  const redirectUri = `${appOrigin}/api/auth/callback/microsoft-entra-id`;

  function copyRedirectUri() {
    if (!redirectUri) return;
    navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Pengaturan
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="inline-grid grid-cols-2 gap-0.5 w-5 h-5 shrink-0">
                <span className="bg-[#f25022] rounded-[1px]"></span>
                <span className="bg-[#7fba00] rounded-[1px]"></span>
                <span className="bg-[#00a4ef] rounded-[1px]"></span>
                <span className="bg-[#ffb900] rounded-[1px]"></span>
              </span>
              Koneksi Server Azure 365
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Kelola kredensial Microsoft Entra ID untuk login pengguna (SSO) dan sinkronisasi direktori Office 365.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                config.isEnabled
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  config.isEnabled ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              {config.isEnabled ? "Integrasi Aktif" : "Nonaktif"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Configuration Card (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-700" />
                Parameter Autentikasi Entra ID
              </CardTitle>
              <CardDescription className="text-xs">
                Kredensial didapatkan dari portal Azure: App registrations &gt; Overview &gt; Certificates & secrets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                {/* Enable Switch */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/70 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isEnabled" className="text-sm font-medium text-slate-900">
                      Aktifkan Login Microsoft 365
                    </Label>
                    <p className="text-xs text-slate-500">
                      Izinkan pengguna masuk menggunakan akun Microsoft 365 & pencarian direktori aktif.
                    </p>
                  </div>
                  <Switch
                    id="isEnabled"
                    checked={config.isEnabled}
                    onCheckedChange={(checked) => setConfig({ ...config, isEnabled: checked })}
                  />
                </div>

                {/* Tenant ID */}
                <div className="space-y-1.5">
                  <Label htmlFor="tenantId" className="text-xs font-medium text-slate-700">
                    Directory (tenant) ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tenantId"
                    value={config.tenantId}
                    onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono text-xs"
                    required
                  />
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    Azure Portal &gt; Microsoft Entra ID &gt; Overview &gt; Directory (tenant) ID
                  </p>
                </div>

                {/* Client ID */}
                <div className="space-y-1.5">
                  <Label htmlFor="clientId" className="text-xs font-medium text-slate-700">
                    Application (client) ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="clientId"
                    value={config.clientId}
                    onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono text-xs"
                    required
                  />
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    Azure Portal &gt; App registrations &gt; Overview &gt; Application (client) ID
                  </p>
                </div>

                {/* Client Secret */}
                <div className="space-y-1.5">
                  <Label htmlFor="clientSecret" className="text-xs font-medium text-slate-700">
                    Client Secret Value{" "}
                    {config.hasSecret ? (
                      <span className="text-slate-400 font-normal">(Tersimpan di server)</span>
                    ) : (
                      <span className="text-red-500">*</span>
                    )}
                  </Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={config.clientSecret}
                    onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                    placeholder={config.hasSecret ? "•••••••••••••••• (Ketik untuk mengganti)" : "Masukkan client secret"}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    Azure Portal &gt; App registrations &gt; Certificates & secrets &gt; New client secret &gt; Value
                  </p>
                </div>

                {/* Live Test Connection Result */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                      testResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {testResult.success ? "Uji Koneksi Berhasil" : "Koneksi Gagal"}
                      </p>
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        {testResult.success ? testResult.message : testResult.error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions Footer: Outline Test Button + Strict Single Primary Solid Button */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testing || saving || !config.tenantId || !config.clientId}
                    className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Menguji Koneksi...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  <Button
                    type="submit"
                    disabled={saving || testing}
                    className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Simpan Konfigurasi
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Side Instructions & Setup Guide (1 col) */}
        <div className="space-y-5">
          {/* Redirect URI Box */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Redirect URI Azure</CardTitle>
              <CardDescription className="text-xs">
                Daftarkan URL ini pada Azure Portal agar Microsoft mengizinkan pengalihan login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <code className="text-[11px] text-slate-800 break-all font-mono select-all">
                  {redirectUri}
                </code>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyRedirectUri}
                className="w-full text-xs border-slate-200"
              >
                {copiedUri ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    Tersalin ke Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                    Salin Redirect URI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Setup Checklist */}
          <Card className="border-slate-200/80 shadow-sm bg-slate-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Panduan Izin Microsoft Graph</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3 text-slate-600">
              <div className="space-y-1.5">
                <p className="font-medium text-slate-900">1. Izin Login SSO (Delegated):</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                  <li><code className="font-mono bg-slate-100 px-1 rounded">User.Read</code></li>
                  <li><code className="font-mono bg-slate-100 px-1 rounded">openid, profile, email</code></li>
                </ul>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-200">
                <p className="font-medium text-slate-900">2. Izin Live Suggestion Direktori (Application):</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                  <li><code className="font-mono bg-slate-100 px-1 rounded">User.Read.All</code> (Application)</li>
                  <li className="text-amber-700 font-medium">
                    Wajib klik tombol <span className="underline">Grant admin consent</span> di Azure Portal.
                  </li>
                </ul>
              </div>

              <div className="pt-2">
                <a
                  href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  Buka Azure Portal App Registrations <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
