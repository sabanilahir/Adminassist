import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Clock, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/");
  }

  // Cek status integrasi Azure
  const oauthConfig = await prisma.oAuthConfig.findUnique({
    where: { provider: "microsoft-entra-id" },
  });

  // Cek status email
  const emailConfig = await prisma.emailConfig.findFirst();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pengaturan Sistem</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pusat konfigurasi server, autentikasi Microsoft 365, template email notifikasi, dan kebijakan SLA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Microsoft 365 / Azure AD Card */}
        <Link href="/admin/settings/azure" className="group">
          <Card className="h-full border-slate-200/80 group-hover:border-slate-400 group-hover:shadow-sm transition-all duration-200 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-grid grid-cols-2 gap-0.5 w-4 h-4 shrink-0">
                    <span className="bg-[#f25022] rounded-[0.5px]"></span>
                    <span className="bg-[#7fba00] rounded-[0.5px]"></span>
                    <span className="bg-[#00a4ef] rounded-[0.5px]"></span>
                    <span className="bg-[#ffb900] rounded-[0.5px]"></span>
                  </span>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Azure 365
                  </CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Koneksi Microsoft Entra ID untuk login akun Microsoft 365 (SSO) dan pencarian direktori user saat penambahan pengguna.
              </CardDescription>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Status Integrasi:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                    oauthConfig?.isEnabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      oauthConfig?.isEnabled ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {oauthConfig?.isEnabled ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Email & Notifications Card */}
        <Link href="/admin/settings/notifications" className="group">
          <Card className="h-full border-slate-200/80 group-hover:border-slate-400 group-hover:shadow-sm transition-all duration-200 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-700" />
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Email & Notifikasi
                  </CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Konfigurasi pengiriman email tiket (SMTP atau Microsoft Graph Mail API) dan pengaturan template notifikasi.
              </CardDescription>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Provider Email:</span>
                <span className="text-slate-700 font-mono text-[11px] font-medium">
                  {emailConfig?.provider === "graph" ? "O365 Graph" : "SMTP"}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* SLA Management Card */}
        <Link href="/sla" className="group">
          <Card className="h-full border-slate-200/80 group-hover:border-slate-400 group-hover:shadow-sm transition-all duration-200 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-700" />
                  <CardTitle className="text-base font-semibold text-slate-900">
                    SLA Policy
                  </CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-xs text-slate-600 leading-relaxed">
                Kelola master Service Level Agreement (SLA), target jam respon & resolusi per level prioritas tiket.
              </CardDescription>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Tautan Langsung:</span>
                <span className="text-slate-700 text-[11px] font-medium">Buka SLA &rarr;</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Security Info Card */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">Keamanan Akses Konfigurasi</p>
          <p className="leading-relaxed text-[11px]">
            Halaman pengaturan sistem hanya dapat diakses oleh user dengan role <strong>ADMIN</strong>. Semua kredensial rahasia seperti Client Secret dan Password SMTP dienkripsi serta diproteksi dari pengaksesan publik.
          </p>
        </div>
      </div>
    </div>
  );
}
