"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const router = useRouter();

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
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftLogin() {
    setError(null);
    setMsLoading(true);
    try {
      const result = await signIn("microsoft-entra-id", { 
        redirect: false,
        callbackUrl: "/"
      });
      
      if (result?.error) {
        setError("Microsoft login failed. Please try again.");
        setMsLoading(false);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {
      setError("Microsoft login failed. Please try again.");
      setMsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-xl border border-border p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Astragraphia Solution Support System Ticketing 
            </h1>
           <h1 className="text-2xl font-bold text-foreground mb-2">(ASSIST)</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your account
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-6"
            onClick={handleMicrosoftLogin}
            disabled={msLoading}
          >
            {msLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting to Microsoft...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#00A4EF"/>
                  <rect x="1" y="11" width="9" height="9" fill="#FFB900"/>
                  <rect x="11" y="11" width="9" height="9" fill="#7FBA00"/>
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
                Or continue with
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

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

            <Button type="submit" className="w-full" disabled={loading}>
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

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-primary hover:underline font-medium"
              >
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-4">
              Demo Credentials
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-muted/50 rounded p-2 text-center">
                <p className="font-medium text-foreground">Admin</p>
                <p className="text-muted-foreground">admin@helpdesk.com</p>
                <p className="text-muted-foreground">admin123</p>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <p className="font-medium text-foreground">PM</p>
                <p className="text-muted-foreground">pm@helpdesk.com</p>
                <p className="text-muted-foreground">pm1234</p>
              </div>
              <div className="bg-muted/50 rounded p-2 text-center">
                <p className="font-medium text-foreground">PIC/Technical</p>
                <p className="text-muted-foreground">technical@email.com</p>
                <p className="text-muted-foreground">tc1234</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}