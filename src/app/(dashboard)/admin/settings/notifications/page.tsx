"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Save,
  Mail,
  Bell,
  Eye,
  EyeOff,
  Cloud,
  Server,
  Send,
  CheckCircle2,
  Copy,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface EmailConfig {
  provider: "smtp" | "graph";
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  graphTenantId: string;
  graphClientId: string;
  graphClientSecret: string;
  graphSenderEmail: string;
  isEnabled: boolean;
}

interface NotificationTemplate {
  type: string;
  subject: string;
  body: string;
}

export default function NotificationSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showGraphSecret, setShowGraphSecret] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");

  const [oauthConfig, setOauthConfig] = useState<{
    clientId?: string;
    tenantId?: string;
  } | null>(null);

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: "graph",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    graphTenantId: "",
    graphClientId: "",
    graphClientSecret: "",
    graphSenderEmail: "",
    isEnabled: false,
  });

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  useEffect(() => {
    if (!session) return;
    if ((session.user as any).role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchData();
  }, [session, router]);

  async function fetchData() {
    try {
      const [emailRes, notifRes, oauthRes] = await Promise.all([
        fetch("/api/settings/email"),
        fetch("/api/settings/notifications"),
        fetch("/api/settings/oauth").catch(() => null),
      ]);

      if (emailRes && emailRes.ok) {
        const emailData = await emailRes.json();
        setEmailConfig({
          provider: emailData.provider || "graph",
          smtpHost: emailData.smtpHost || "smtp.gmail.com",
          smtpPort: emailData.smtpPort || 587,
          smtpUser: emailData.smtpUser || "",
          smtpPass: emailData.smtpPass || "",
          smtpFrom: emailData.smtpFrom || "",
          graphTenantId: emailData.graphTenantId || "",
          graphClientId: emailData.graphClientId || "",
          graphClientSecret: emailData.graphClientSecret || "",
          graphSenderEmail: emailData.graphSenderEmail || "",
          isEnabled: emailData.isEnabled ?? false,
        });
      }

      if (notifRes && notifRes.ok) {
        const notifData = await notifRes.json();
        setTemplates(notifData);
      }

      if (oauthRes && oauthRes.ok) {
        const oauthData = await oauthRes.json();
        if (oauthData.clientId || oauthData.tenantId) {
          setOauthConfig({
            clientId: oauthData.clientId || "",
            tenantId: oauthData.tenantId || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleAutofillFromOAuth() {
    if (!oauthConfig) return;
    setEmailConfig((prev) => ({
      ...prev,
      graphTenantId: prev.graphTenantId || oauthConfig.tenantId || "",
      graphClientId: prev.graphClientId || oauthConfig.clientId || "",
    }));
    toast({
      title: "Data Disalin",
      description: "Tenant ID dan Client ID disalin dari pengaturan Login Microsoft Entra ID.",
    });
  }

  async function saveEmailConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/settings/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailConfig),
      });

      if (res.ok) {
        toast({
          title: "Pengaturan Tersimpan",
          description: "Konfigurasi notifikasi email berhasil diperbarui.",
        });
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan konfigurasi.");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan konfigurasi email.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTestingConnection(true);
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "connection",
          provider: emailConfig.provider,
          config: emailConfig,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: "Koneksi Berhasil",
          description:
            data.message ||
            (emailConfig.provider === "graph"
              ? "Koneksi ke API Microsoft Graph O365 berhasil terverifikasi."
              : "Koneksi SMTP berhasil terverifikasi."),
        });
      } else {
        toast({
          title: "Koneksi Gagal",
          description: data.error || "Gagal menghubungi server email.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || String(e),
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  }

  async function handleSendTestEmail() {
    if (!testEmailTo.trim() || !testEmailTo.includes("@")) {
      toast({
        title: "Email Tidak Valid",
        description: "Masukkan alamat email penerima yang valid untuk uji coba pengiriman.",
        variant: "destructive",
      });
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch("/api/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "send",
          to: testEmailTo.trim(),
          provider: emailConfig.provider,
          config: emailConfig,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: "Email Uji Coba Terkirim",
          description: `Email pengujian berhasil dikirim ke ${testEmailTo.trim()}. Silakan periksa inbox.`,
        });
      } else {
        toast({
          title: "Gagal Mengirim Email",
          description: data.error || "Gagal mengirim email uji coba.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || String(e),
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
    }
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    setSaving(true);

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      });

      if (res.ok) {
        toast({
          title: "Template Saved",
          description: "Notification template has been updated.",
        });
        fetchData();
        setEditingTemplate(null);
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function getTemplatePreview(body: string): string {
    return body
      .replace(/{trackingId}/g, "TKT-2026-0001")
      .replace(/{title}/g, "Sample Ticket Title")
      .replace(/{description}/g, "This is a sample ticket description.")
      .replace(/{status}/g, "IN_PROGRESS")
      .replace(/{oldStatus}/g, "NEW")
      .replace(/{newStatus}/g, "IN_PROGRESS")
      .replace(/{priority}/g, "HIGH")
      .replace(/{createdBy}/g, "John Doe")
      .replace(/{assignedTo}/g, "Jane Smith")
      .replace(/{updatedBy}/g, "Admin User")
      .replace(/{createdAt}/g, new Date().toLocaleString("id-ID"))
      .replace(/{updatedAt}/g, new Date().toLocaleString("id-ID"));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pengaturan Notifikasi</h1>
        <p className="text-slate-500 text-sm mt-1">
          Konfigurasi konektor pengiriman email notifikasi tiket dan template pesan
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Konfigurasi Email & API O365
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Template Notifikasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-6 space-y-6">
          <form onSubmit={saveEmailConfig} className="space-y-6">
            {/* Main Email Config Card */}
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-4 border-b border-slate-100">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-900">
                  <Mail className="h-5 w-5 text-slate-700" />
                  Konektor Email Notifikasi
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pilih saluran pengiriman email melalui Microsoft 365 Graph Connector atau SMTP Relay.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Enable Switch */}
                <div className="flex items-center justify-between p-4 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isEnabled" className="text-sm font-semibold text-slate-900">
                      Aktifkan Notifikasi Email Otomatis
                    </Label>
                    <p className="text-xs text-slate-500">
                      Kirim email saat tiket baru dibuat, tiket diklaim, atau ada perubahan status tiket
                    </p>
                  </div>
                  <Switch
                    id="isEnabled"
                    checked={emailConfig.isEnabled}
                    onCheckedChange={(checked) =>
                      setEmailConfig({ ...emailConfig, isEnabled: checked })
                    }
                  />
                </div>

                {/* Provider Selector Cards */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Pilihan Provider Pengiriman
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Microsoft Graph API Option */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setEmailConfig({ ...emailConfig, provider: "graph" })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setEmailConfig({ ...emailConfig, provider: "graph" });
                        }
                      }}
                      className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
                        emailConfig.provider === "graph"
                          ? "border-slate-900 bg-slate-50/80 ring-1 ring-slate-900"
                          : "border-slate-200 bg-white hover:bg-slate-50/60 text-slate-600"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-md ${
                            emailConfig.provider === "graph"
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <Cloud className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-sm text-slate-900">
                              Microsoft 365 (Graph API)
                            </span>
                            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Enterprise
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Terhubung langsung ke Microsoft Graph REST API O365 via Entra ID (Client Credentials) tanpa ketergantungan basic auth SMTP.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SMTP Option */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setEmailConfig({ ...emailConfig, provider: "smtp" })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setEmailConfig({ ...emailConfig, provider: "smtp" });
                        }
                      }}
                      className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
                        emailConfig.provider === "smtp"
                          ? "border-slate-900 bg-slate-50/80 ring-1 ring-slate-900"
                          : "border-slate-200 bg-white hover:bg-slate-50/60 text-slate-600"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-md ${
                            emailConfig.provider === "smtp"
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          <Server className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm text-slate-900">
                            SMTP Server Relay
                          </span>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Protokol standar SMTP untuk Gmail, Google Workspace, Mailpit lokal, atau relay server internal perusahaan.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRAPH CONNECTOR FIELDS */}
                {emailConfig.provider === "graph" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Parameter Microsoft Graph API (O365)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Masukkan kredensial App Registration Azure / Microsoft Entra ID
                        </p>
                      </div>

                      {oauthConfig?.tenantId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAutofillFromOAuth}
                          className="h-8 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                          Salin dari Entra ID Login
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="graphTenantId" className="text-xs font-medium text-slate-700">
                          Directory (Tenant) ID <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="graphTenantId"
                          value={emailConfig.graphTenantId}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, graphTenantId: e.target.value })
                          }
                          placeholder="e.g. 72f988bf-86f1-41af-91ab-2d7cd011db47"
                          className="font-mono text-xs h-9 bg-white border-slate-200"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="graphClientId" className="text-xs font-medium text-slate-700">
                          Application (Client) ID <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="graphClientId"
                          value={emailConfig.graphClientId}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, graphClientId: e.target.value })
                          }
                          placeholder="e.g. b21d3f9e-29f1-46ab-a0dc-845cd011ab23"
                          className="font-mono text-xs h-9 bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="graphClientSecret"
                          className="text-xs font-medium text-slate-700"
                        >
                          Client Secret <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="graphClientSecret"
                            type={showGraphSecret ? "text" : "password"}
                            value={emailConfig.graphClientSecret}
                            onChange={(e) =>
                              setEmailConfig({
                                ...emailConfig,
                                graphClientSecret: e.target.value,
                              })
                            }
                            placeholder="Value Client Secret dari Azure Portal"
                            className="text-xs h-9 pr-9 bg-white border-slate-200 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowGraphSecret(!showGraphSecret)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            tabIndex={-1}
                          >
                            {showGraphSecret ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="graphSenderEmail"
                          className="text-xs font-medium text-slate-700"
                        >
                          Akun Pengirim / Mailbox O365 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="graphSenderEmail"
                          type="email"
                          value={emailConfig.graphSenderEmail}
                          onChange={(e) =>
                            setEmailConfig({
                              ...emailConfig,
                              graphSenderEmail: e.target.value,
                            })
                          }
                          placeholder="helpdesk@perusahaan.com"
                          className="text-xs h-9 bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Azure Permissions Guidance */}
                    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-600 space-y-1.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Persyaratan Hak Akses API Azure / Entra ID:
                      </div>
                      <p className="leading-relaxed text-slate-600">
                        Pastikan App Registration di Microsoft Entra ID telah diberikan API
                        Permission Microsoft Graph bertipe <strong>Application</strong>:{" "}
                        <code className="font-mono text-slate-900 bg-slate-200/80 px-1 py-0.5 rounded text-[11px]">
                          Mail.Send
                        </code>{" "}
                        dan telah dilakukan <strong>Grant admin consent</strong>. Akun pengirim harus
                        memiliki lisensi Exchange Online / Mailbox aktif di tenant O365.
                      </p>
                    </div>
                  </div>
                )}

                {/* SMTP FIELDS */}
                {emailConfig.provider === "smtp" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Parameter Server SMTP Relay
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pengaturan koneksi host dan port server pengirim surat
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="smtpHost" className="text-xs font-medium text-slate-700">
                          SMTP Host <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="smtpHost"
                          value={emailConfig.smtpHost}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
                          }
                          placeholder="smtp.gmail.com atau mail.perusahaan.com"
                          className="text-xs h-9 bg-white border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="smtpPort" className="text-xs font-medium text-slate-700">
                          SMTP Port <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          value={emailConfig.smtpPort}
                          onChange={(e) =>
                            setEmailConfig({
                              ...emailConfig,
                              smtpPort: parseInt(e.target.value) || 587,
                            })
                          }
                          placeholder="587 / 465 / 25"
                          className="text-xs h-9 bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="smtpUser" className="text-xs font-medium text-slate-700">
                          SMTP Username / Email
                        </Label>
                        <Input
                          id="smtpUser"
                          value={emailConfig.smtpUser}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, smtpUser: e.target.value })
                          }
                          placeholder="username@perusahaan.com"
                          className="text-xs h-9 bg-white border-slate-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="smtpPass" className="text-xs font-medium text-slate-700">
                          SMTP Password / App Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="smtpPass"
                            type={showSmtpPass ? "text" : "password"}
                            value={emailConfig.smtpPass}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, smtpPass: e.target.value })
                            }
                            placeholder="Password atau App Password"
                            className="text-xs h-9 pr-9 bg-white border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmtpPass(!showSmtpPass)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            tabIndex={-1}
                          >
                            {showSmtpPass ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="smtpFrom" className="text-xs font-medium text-slate-700">
                        From Address (Alamat Pengirim)
                      </Label>
                      <Input
                        id="smtpFrom"
                        type="email"
                        value={emailConfig.smtpFrom}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, smtpFrom: e.target.value })
                        }
                        placeholder="noreply@perusahaan.com"
                        className="text-xs h-9 bg-white border-slate-200"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Connection and Send Card */}
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Uji Konektivitas & Pengiriman Email
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Verifikasi token/kredensial dan lakukan simulasi pengiriman email ke alamat tujuan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900">
                      Uji Sambungan ({emailConfig.provider === "graph" ? "O365 Graph API" : "SMTP"})
                    </div>
                    <p className="text-xs text-slate-500">
                      Memvalidasi autentikasi token atau koneksi soket tanpa mengirimkan surat
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testingConnection || saving}
                    onClick={handleTestConnection}
                    className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-9 text-xs font-medium whitespace-nowrap"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-slate-500" />
                        Menguji Koneksi...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-3.5 w-3.5 text-slate-500" />
                        Test Koneksi
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg space-y-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900">
                      Uji Pengiriman Email (Test Send)
                    </div>
                    <p className="text-xs text-slate-500">
                      Kirim satu email uji coba menggunakan konfigurasi dan provider aktif saat ini
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="email"
                      placeholder="Masukkan alamat email penerima (e.g. admin@company.com)"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      className="text-xs h-9 bg-white border-slate-200 max-w-md"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={sendingTest || saving}
                      onClick={handleSendTestEmail}
                      className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-9 text-xs font-medium whitespace-nowrap"
                    >
                      {sendingTest ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-slate-500" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-3.5 w-3.5 text-slate-500" />
                          Test Kirim Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving || testingConnection || sendingTest}
                className="bg-slate-900 text-white hover:bg-slate-800 h-9 px-4 text-xs font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Konfigurasi
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="space-y-6">
            {templates.map((template) => (
              <Card key={template.type} className="border-slate-200 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="capitalize font-semibold text-slate-900">
                      {template.type.replace("_", " ")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                      className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs h-8"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Edit Template
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    <code className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono">
                      Subject: {template.subject}
                    </code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-lg">
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">Pratinjau Format Pesan:</h4>
                    <pre className="text-xs whitespace-pre-wrap bg-white p-4 rounded border border-slate-200 overflow-auto max-h-60 font-sans text-slate-800">
                      {getTemplatePreview(template.body)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">Variabel yang Tersedia:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "trackingId",
                        "title",
                        "description",
                        "status",
                        "oldStatus",
                        "newStatus",
                        "priority",
                        "createdBy",
                        "assignedTo",
                        "updatedBy",
                        "createdAt",
                        "updatedAt",
                      ].map((v) => (
                        <code
                          key={v}
                          className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono"
                        >
                          {`{${v}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto border-slate-200 shadow-xl bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="capitalize text-slate-900 font-semibold">
                  Edit Template: {editingTemplate.type.replace("_", " ")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTemplate(null)}
                  className="text-slate-500 hover:text-slate-800 h-8"
                >
                  Tutup
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Subjek Email</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                  }
                  className="text-xs h-9 bg-white border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Isi Pesan (HTML/Text)</Label>
                <textarea
                  className="w-full min-h-[220px] p-3 text-xs border border-slate-200 rounded-md font-mono bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  value={editingTemplate.body}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, body: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTemplate(null)}
                  className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 h-9 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={saveTemplate}
                  disabled={saving}
                  className="bg-slate-900 text-white hover:bg-slate-800 h-9 text-xs"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan Template"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
