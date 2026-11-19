import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LoginForm } from "./_components/login-form";
import { getAppBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const branding = await getAppBranding();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        }
      >
        <LoginForm branding={branding} />
      </Suspense>
    </div>
  );
}
