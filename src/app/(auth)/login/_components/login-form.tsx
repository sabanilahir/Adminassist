"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LoginFormProps {
  branding?: {
    appName: string;
    appDescription?: string | null;
    loginLayout: string;
    logoLightUrl: string;
    logoDarkUrl: string;
    hasCustomLight: boolean;
    hasCustomDark: boolean;
    helpTitle?: string | null;
    helpDescription?: string | null;
    helpContactEmail?: string | null;
    helpContactPhone?: string | null;
  };
}

export function LoginForm({ branding }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (!errorParam) return;

    if (errorParam === "UserNotRegistered") {
      setError(
        "Akun Microsoft 365 Anda belum terdaftar di aplikasi ASSIST. Silakan hubungi Administrator untuk mendaftarkan akun Anda terlebih dahulu."
      );
    } else if (errorParam === "OAuthDisabled") {
      setError(
        "Login menggunakan akun Microsoft 365 saat ini sedang dinonaktifkan oleh Administrator."
      );
    } else if (errorParam === "AccessDenied") {
      setError(
        "Akses ditolak. Akun Microsoft Anda belum terdaftar atau tidak memiliki izin akses."
      );
    } else if (
      errorParam === "OAuthSignin" ||
      errorParam === "OAuthCallback" ||
      errorParam === "OAuthCreateAccount"
    ) {
      setError(
        "Gagal melakukan autentikasi dengan server Microsoft. Pastikan konfigurasi Azure sudah benar."
      );
    } else {
      setError("Terjadi kesalahan saat proses login. Silakan coba kembali.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email atau password salah");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftLogin() {
    setError(null);
    setMsLoading(true);
    try {
      await signIn("microsoft-entra-id", {
        callbackUrl: "/",
      });
    } catch (err) {
      setError("Gagal menghubungkan ke Microsoft 365.");
      setMsLoading(false);
    }
  }

  // Tentukan file logo berdasarkan custom status dan layout
  const isStacked = !branding?.hasCustomLight && branding?.loginLayout === "stacked";
  const lightLogo = branding?.hasCustomLight
    ? branding.logoLightUrl
    : isStacked
    ? "/images/branding/logo-stacked-light.png"
    : branding?.logoLightUrl || "/images/branding/logo-horizontal-light.png";

  const darkLogo = branding?.hasCustomDark
    ? branding.logoDarkUrl
    : isStacked
    ? "/images/branding/logo-stacked-dark.png"
    : branding?.logoDarkUrl || "/images/branding/logo-horizontal-dark.png";

  const helpTitle = branding?.helpTitle || "Access Help & Credential Reset";
  const helpDescription =
    branding?.helpDescription ||
    "In accordance with ISO/IEC 27001 document governance policy, account credentials integrate with corporate Active Directory / LDAP. Password resets are handled by the IT Service Desk.";
  const helpContactEmail =
    branding?.helpContactEmail || "servicedesk@company.internal";
  const helpContactPhone = branding?.helpContactPhone || "ext. 4400 / 4401";

  return (
    <div className="w-full max-w-md">
      <div className="bg-card rounded-lg shadow-xl border border-border p-8">
        {/* Header Kartu Login: Hanya gambar logo sesuai arahan user */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-5">
            <img
              src={lightLogo}
              alt={branding?.appName || "ASSIST"}
              className={cn(
                "w-auto object-contain dark:hidden transition-all",
                isStacked
                  ? "h-28 md:h-36 max-h-36 max-w-[240px]"
                  : "h-20 md:h-24 max-h-28 max-w-[340px] md:max-w-[380px]"
              )}
            />
            <img
              src={darkLogo}
              alt={branding?.appName || "ASSIST"}
              className={cn(
                "w-auto object-contain hidden dark:block transition-all",
                isStacked
                  ? "h-28 md:h-36 max-h-36 max-w-[240px]"
                  : "h-20 md:h-24 max-h-28 max-w-[340px] md:max-w-[380px]"
              )}
            />
          </div>
          <p className="text-muted-foreground text-sm font-normal">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md p-3 mb-6 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full mb-6 border-slate-200 hover:bg-slate-50 transition-colors"
          onClick={handleMicrosoftLogin}
          disabled={msLoading}
        >
          {msLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menghubungkan ke Microsoft...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4 shrink-0"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#00A4EF" />
                <rect x="1" y="11" width="9" height="9" fill="#FFB900" />
                <rect x="11" y="11" width="9" height="9" fill="#7FBA00" />
              </svg>
              Sign in with Microsoft
            </>
          )}
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with credentials
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="password"
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Tautan Bantuan Login (Need help signing in?) */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors font-medium hover:underline"
          >
            Need help signing in?
          </button>
        </div>

        {/* Modal Dialog Bantuan Sesuai Mockup */}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl">
            <div className="flex flex-col items-start w-full">
              {/* Shield Icon Box */}
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-500 mb-4">
                <ShieldAlert className="w-5 h-5" />
              </div>

              {/* Title & Description */}
              <DialogHeader className="text-left space-y-1.5 p-0 w-full">
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {helpTitle}
                </DialogTitle>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                  {helpDescription}
                </p>
              </DialogHeader>

              {/* Key-Value Contact Box */}
              <div className="w-full mt-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    IT Service Desk:
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 select-all font-medium text-[11px]">
                    {helpContactEmail}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Emergency Hotline:
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 select-all font-medium text-[11px]">
                    {helpContactPhone}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full mt-6 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-medium text-xs h-9 px-4 rounded-lg shadow-none"
                >
                  Understood & Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Demo Credentials di Non-Production Mode */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-4">
              Demo Credentials (Internal)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/50 rounded p-2 text-center">
                <p className="font-medium text-foreground">Admin</p>
                <p className="text-muted-foreground truncate" title="admin@helpdesk.com">
                  admin@helpdesk.com
                </p>
                <p className="text-muted-foreground">admin123</p>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <p className="font-medium text-foreground">Admin Ticket</p>
                <p
                  className="text-muted-foreground truncate"
                  title="adminticket@helpdesk.com"
                >
                  adminticket@helpdesk.com
                </p>
                <p className="text-muted-foreground">adminticket123</p>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <p className="font-medium text-foreground">Project Manager</p>
                <p className="text-muted-foreground truncate" title="pm1@helpdesk.com">
                  pm1@helpdesk.com
                </p>
                <p className="text-muted-foreground">pm123</p>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <p className="font-medium text-foreground">PIC / Teknisi</p>
                <p className="text-muted-foreground truncate" title="pic1@helpdesk.com">
                  pic1@helpdesk.com
                </p>
                <p className="text-muted-foreground">pic123</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
