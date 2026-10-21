import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUsers } from "@/actions/user-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddUserForm } from "./_components/add-user-form";
import { EditUserButton } from "./_components/edit-user-button"; // <-- 1. Import EditUserButton
import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react"; // Hapus import Edit yang tidak dipakai jika ingin

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
          <p className="text-muted-foreground mt-1">Manage system users and roles</p>
        </div>
        <AddUserForm />
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left text-sm font-medium">Name</th>
              <th className="h-12 px-4 text-left text-sm font-medium">Email</th>
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
                  <Badge variant={getRoleBadge(user.role)}>{getRoleLabel(user.role)}</Badge>
                </td>
                <td className="p-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
                <td className="p-4 text-right space-x-2">
                  {/* 2. Ganti tombol statis dengan EditUserButton */}
                  <EditUserButton user={user} />
                  
                  {/* Contoh tombol delete */}
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="Delete User">
                    <Trash2 className="h-4 w-4" />
                  </Button>
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