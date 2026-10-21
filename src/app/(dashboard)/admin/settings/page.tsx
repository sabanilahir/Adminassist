"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Shield, Info, Bell, Mail } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    clientId: "",
    clientSecret: "",
    tenantId: "",
    isEnabled: false,
  });

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

    try {
      const res = await fetch("/api/settings/oauth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast({
          title: "Settings saved",
          description: "OAuth configuration has been updated successfully.",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          System settings and configuration
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/settings/notifications">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Configure SMTP settings and email notification templates for ticket updates
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Microsoft OAuth Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Microsoft Entra ID (Azure AD) Configuration
          </CardTitle>
          <CardDescription>
            Configure Microsoft 365 login integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Enable Switch */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="isEnabled" className="text-base">Enable Microsoft Login</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to sign in with their Microsoft 365 account
                </p>
              </div>
              <Switch
                id="isEnabled"
                checked={config.isEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, isEnabled: checked })}
              />
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID (Application ID)</Label>
              <Input
                id="clientId"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Azure Portal &gt; App registrations &gt; Overview &gt; Application (client) ID
              </p>
            </div>

            {/* Tenant ID */}
            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant ID (Directory ID)</Label>
              <Input
                id="tenantId"
                value={config.tenantId}
                onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Azure Portal &gt; App registrations &gt; Overview &gt; Directory (tenant) ID
              </p>
            </div>

            {/* Client Secret */}
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                value={config.clientSecret}
                onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                placeholder="Enter client secret"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Azure Portal &gt; App registrations &gt; Certificates & secrets &gt; New client secret
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Fill in Client ID, Tenant ID, and Client Secret from Azure Portal</li>
                <li>Enable the toggle to activate Microsoft login</li>
                <li>Add redirect URI in Azure: <code className="bg-blue-100 px-1 rounded">http://localhost:3000/api/auth/callback/microsoft-entra-id</code></li>
                <li>Users must be registered in the application first before logging in with Microsoft</li>
              </ol>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}