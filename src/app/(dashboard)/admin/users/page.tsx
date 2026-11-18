import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUsers, deleteUser } from "@/actions/user-actions";
import { Badge } from "@/components/ui/badge";
import { AddUserForm } from "./_components/add-user-form";
import { EditUserButton } from "./_components/edit-user-button";
import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  let users: any[] = [];
  try {
    users = await getUsers();
  } catch (error) {
    console.error("Error loading users:", error);
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ADMIN: "destructive",
      PROJECT_MANAGER: "default",
      PIC: "secondary",
      USER: "outline",
    };
    return variants[role] || "outline";
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Admin",
      PROJECT_MANAGER: "Project Manager",
      PIC: "PIC",
      USER: "User",
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">Manage system users, authentication types, and roles</p>
        </div>
        <AddUserForm />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left text-sm font-medium">Name</th>
              <th className="h-12 px-4 text-left text-sm font-medium">Email</th>
              <th className="h-12 px-4 text-left text-sm font-medium">Tipe User</th>
              <th className="h-12 px-4 text-left text-sm font-medium">Role</th>
              <th className="h-12 px-4 text-left text-sm font-medium">Created</th>
              <th className="h-12 px-4 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-accent/50">
                <td className="p-4 font-medium">{user.name}</td>
                <td className="p-4 text-muted-foreground">{user.email}</td>
                <td className="p-4">
                  {user.userType === "MICROSOFT_365" ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="inline-grid grid-cols-2 gap-0.5 w-3 h-3 shrink-0">
                        <span className="bg-[#f25022] rounded-[0.5px]"></span>
                        <span className="bg-[#7fba00] rounded-[0.5px]"></span>
                        <span className="bg-[#00a4ef] rounded-[0.5px]"></span>
                        <span className="bg-[#ffb900] rounded-[0.5px]"></span>
                      </span>
                      <span>Microsoft 365</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium">
                      Internal
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <Badge variant={getRoleBadge(user.role)}>{getRoleLabel(user.role)}</Badge>
                </td>
                <td className="p-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
                <td className="p-4 text-right space-x-2">
                  <EditUserButton user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">No users found</div>
        )}
      </div>
    </div>
  );
}
