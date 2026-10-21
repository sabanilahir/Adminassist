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
import { Loader2, Save, Mail, Bell, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
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
  const [testEmailTo, setTestEmailTo] = useState("");
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
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
      const [emailRes, notifRes] = await Promise.all([
        fetch("/api/settings/email"),
        fetch("/api/settings/notifications")
      ]);
      
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        setEmailConfig({
          smtpHost: emailData.smtpHost || "smtp.gmail.com",
          smtpPort: emailData.smtpPort || 587,
          smtpUser: emailData.smtpUser || "",
          smtpPass: emailData.smtpPass || "",
          smtpFrom: emailData.smtpFrom || "",
          isEnabled: emailData.isEnabled || false,
        });
      }
      
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setTemplates(notifData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
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
          title: "Email Config Saved",
          description: "Email configuration has been updated successfully.",
        });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save email configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure email notifications and message templates
        </p>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Configuration
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Email Configuration
              </CardTitle>
              <CardDescription>
                Configure SMTP server for sending email notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveEmailConfig} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="isEnabled" className="text-base">Enable Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications when tickets are created or updated
                    </p>
                  </div>
                  <Switch
                    id="isEnabled"
                    checked={emailConfig.isEnabled}
                    onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, isEnabled: checked })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={emailConfig.smtpHost}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={emailConfig.smtpPort}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: parseInt(e.target.value) })}
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username / Email</Label>
                  <Input
                    id="smtpUser"
                    type="email"
                    value={emailConfig.smtpUser}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpPass">SMTP Password / App Password</Label>
                  <Input
                    id="smtpPass"
                    type="password"
                    value={emailConfig.smtpPass}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })}
                    placeholder="Your app password"
                  />
                  <p className="text-xs text-muted-foreground">
                    For Gmail, use an App Password. Generate at: myaccount.google.com &gt; Security &gt; App passwords
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpFrom">From Address</Label>
                  <Input
                    id="smtpFrom"
                    type="email"
                    value={emailConfig.smtpFrom}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpFrom: e.target.value })}
                    placeholder="helpdesk@company.com"
                  />
                </div>

                {/* Save Config */}
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Email Config
                        </>
                      )}
                    </Button>

                    {/* Test SMTP Connection */}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const res = await fetch("/api/settings/email/test", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ type: "connection" }),
                          });
                          const data = await res.json();
                          toast({
                            title: data.success ? "SMTP Connection OK" : "SMTP Connection Failed",
                            description: data.error || "Connection verified successfully.",
                            variant: data.success ? undefined : "destructive",
                          });
                        } catch (e) {
                          toast({ title: "Error", description: String(e), variant: "destructive" });
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                  </div>

                  {/* Test Send Email */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder="Recipient email for test send"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const res = await fetch("/api/settings/email/test", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ type: "send", to: testEmailTo }),
                          });
                          const data = await res.json();
                          toast({
                            title: data.success ? "Test Email Sent" : "Test Email Failed",
                            description: data.error || "Check the recipient inbox.",
                            variant: data.success ? undefined : "destructive",
                          });
                        } catch (e) {
                          toast({ title: "Error", description: String(e), variant: "destructive" });
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Test Email"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="space-y-6">
            {templates.map((template) => (
              <Card key={template.type}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">
                      {template.type.replace("_", " ")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      Subject: {template.subject}
                    </code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Preview:</h4>
                    <pre className="text-xs whitespace-pre-wrap bg-white p-4 rounded border overflow-auto max-h-60">
                      {getTemplatePreview(template.body)}
                    </pre>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Available Variables:</h4>
                    <div className="flex flex-wrap gap-2">
                      {["trackingId", "title", "description", "status", "oldStatus", "newStatus", "priority", "createdBy", "assignedTo", "updatedBy", "createdAt", "updatedAt"].map((v) => (
                        <code key={v} className="bg-muted px-2 py-1 rounded text-xs">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">
                  Edit: {editingTemplate.type.replace("_", " ")}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="[ASSIST] Ticket Updated - {trackingId}"
                />
              </div>
              <div className="space-y-2">
                <Label>Email Body</Label>
                <textarea
                  className="w-full h-64 p-3 border rounded-lg font-mono text-sm bg-muted/50"
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  placeholder="Enter email template..."
                />
                <p className="text-xs text-muted-foreground">
                  Use {`{variableName}`} to insert dynamic values. Example: {`{trackingId}`} will be replaced with the actual ticket ID.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Preview:</h4>
                <pre className="text-xs whitespace-pre-wrap bg-white p-4 rounded border overflow-auto max-h-40">
                  {getTemplatePreview(editingTemplate.body)}
                </pre>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={saveTemplate} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </>
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