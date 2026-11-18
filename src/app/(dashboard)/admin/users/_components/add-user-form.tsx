"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createUser, checkUserEmail } from "@/actions/user-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AzureUserSuggestion {
  id: string;
  name: string;
  email: string;
  userPrincipalName: string;
  jobTitle?: string | null;
  department?: string | null;
  isAlreadyAdded?: boolean;
}

export function AddUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [userType, setUserType] = useState<"INTERNAL" | "MICROSOFT_365">("INTERNAL");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "PIC" | "PROJECT_MANAGER" | "ADMIN">("USER");

  // Microsoft 365 Autocomplete State
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AzureUserSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Email Validation State
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    exists: boolean;
    message?: string;
  } | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setUserType("INTERNAL");
      setName("");
      setEmail("");
      setPassword("");
      setRole("USER");
      setSearchQuery("");
      setSuggestions([]);
      setSearchError(null);
      setEmailStatus(null);
      setError(null);
    }
  }, [open]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for Microsoft 365 directory users
  useEffect(() => {
    if (userType !== "MICROSOFT_365") return;
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setSearchError(null);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/azure/users?q=${encodeURIComponent(searchQuery.trim())}`
        );
        const data = await res.json();
        if (!res.ok) {
          setSearchError(data.error || "Gagal mencari user di Office 365");
          setSuggestions([]);
        } else {
          setSuggestions(data.users || []);
          setIsDropdownOpen(true);
        }
      } catch (err: any) {
        setSearchError("Gagal menghubungi server Microsoft 365");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, userType]);

  // Check email existence in database
  async function validateEmail(targetEmail: string) {
    const trimmed = targetEmail.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setEmailStatus(null);
      return;
    }

    setEmailChecking(true);
    try {
      const res = await checkUserEmail(trimmed);
      if (res.exists) {
        setEmailStatus({
          exists: true,
          message: `User dengan email ini sudah terdaftar (${res.user?.name} - ${res.user?.role}).`,
        });
      } else {
        setEmailStatus({ exists: false });
      }
    } catch {
      setEmailStatus(null);
    } finally {
      setEmailChecking(false);
    }
  }

  function handleSelectSuggestion(user: AzureUserSuggestion) {
    if (user.isAlreadyAdded) return;
    setName(user.name);
    setEmail(user.email);
    setSearchQuery(user.email);
    setIsDropdownOpen(false);
    validateEmail(user.email);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (emailStatus?.exists) {
      setError(emailStatus.message || "Email sudah terdaftar di aplikasi.");
      return;
    }

    if (!name.trim() || !email.trim()) {
      setError("Nama dan email wajib diisi.");
      return;
    }

    if (userType === "INTERNAL") {
      if (!password) {
        setError("Password wajib diisi untuk user internal.");
        return;
      }
      if (password.length < 6) {
        setError("Password minimal 6 karakter.");
        return;
      }
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("email", email.trim());
      fd.append("role", role);
      fd.append("userType", userType);
      if (userType === "INTERNAL") {
        fd.append("password", password);
      }

      const result = await createUser(fd);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError("Gagal membuat user. Silakan coba kembali.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Tambah User Baru</DialogTitle>
        </DialogHeader>

        {/* User Type Switcher (Segmented Control) */}
        <div className="bg-slate-100 p-1 rounded-lg grid grid-cols-2 gap-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setUserType("INTERNAL");
              setSearchQuery("");
              setError(null);
            }}
            className={cn(
              "py-1.5 px-3 rounded-md transition-all text-center",
              userType === "INTERNAL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Internal User
          </button>
          <button
            type="button"
            onClick={() => {
              setUserType("MICROSOFT_365");
              setError(null);
            }}
            className={cn(
              "py-1.5 px-3 rounded-md transition-all text-center flex items-center justify-center gap-1.5",
              userType === "MICROSOFT_365"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <span className="inline-grid grid-cols-2 gap-0.5 w-2.5 h-2.5">
              <span className="bg-[#f25022] rounded-[0.5px]"></span>
              <span className="bg-[#7fba00] rounded-[0.5px]"></span>
              <span className="bg-[#00a4ef] rounded-[0.5px]"></span>
              <span className="bg-[#ffb900] rounded-[0.5px]"></span>
            </span>
            Microsoft 365 Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Microsoft 365 Search / Suggestion Field */}
          {userType === "MICROSOFT_365" && (
            <div className="space-y-1.5" ref={dropdownRef}>
              <Label htmlFor="m365-search" className="text-xs font-medium text-slate-700">
                Cari Akun di Direktori Office 365
              </Label>
              <div className="relative">
                <Input
                  id="m365-search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setEmail(e.target.value);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setIsDropdownOpen(true);
                  }}
                  onBlur={() => validateEmail(email)}
                  placeholder="Ketik nama atau email Office 365..."
                  className="pr-8 text-sm"
                  autoComplete="off"
                />
                <div className="absolute right-2.5 top-2.5 text-slate-400">
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  ) : null}
                </div>

                {/* Suggestions Dropdown */}
                {isDropdownOpen && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                      Hasil Direktori Microsoft 365
                    </div>
                    {suggestions.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        disabled={u.isAlreadyAdded}
                        onClick={() => handleSelectSuggestion(u)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors",
                          u.isAlreadyAdded
                            ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                            : "hover:bg-slate-100 text-slate-800"
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                          {u.department && (
                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3" />
                              {u.department} {u.jobTitle ? `• ${u.jobTitle}` : ""}
                            </p>
                          )}
                        </div>
                        {u.isAlreadyAdded ? (
                          <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                            Terdaftar
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 hover:text-slate-900 shrink-0">
                            Pilih
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {searchError && (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 flex items-center justify-between mt-1">
                  <span>{searchError}</span>
                  <Link
                    href="/admin/settings/azure"
                    className="underline font-medium inline-flex items-center gap-1 text-[11px] hover:text-amber-800 shrink-0 ml-2"
                  >
                    Atur Azure <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-slate-700">
              Nama Lengkap
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              required
              className="text-sm"
            />
          </div>

          {/* Email Field (untuk Internal User atau hasil autofill M365) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="text-xs font-medium text-slate-700">
                Email
              </Label>
              {emailChecking && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Memeriksa...
                </span>
              )}
              {!emailChecking && emailStatus?.exists && (
                <span className="text-[11px] text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Email sudah terdaftar
                </span>
              )}
              {!emailChecking && emailStatus && !emailStatus.exists && email.includes("@") && (
                <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Email tersedia
                </span>
              )}
            </div>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (userType === "MICROSOFT_365") setSearchQuery(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              placeholder="user@perusahaan.com"
              required
              className={cn(
                "text-sm",
                emailStatus?.exists && "border-red-300 focus-visible:ring-red-400"
              )}
            />
          </div>

          {/* Role Field */}
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs font-medium text-slate-700">
              Role
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger id="role" className="text-sm">
                <SelectValue placeholder="Pilih Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User (Pelapor Tiket)</SelectItem>
                <SelectItem value="PIC">PIC (Teknisi / Penanggung Jawab)</SelectItem>
                <SelectItem value="PROJECT_MANAGER">Project Manager</SelectItem>
                <SelectItem value="ADMIN">Admin Sistem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password Field (Hanya untuk Internal User) */}
          {userType === "INTERNAL" ? (
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                className="text-sm"
              />
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-md text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-800">Autentikasi Single Sign-On (SSO)</p>
              <p className="text-[11px] text-slate-500">
                User tidak memerlukan password lokal. Pengguna akan masuk langsung menggunakan akun Microsoft 365 (Azure AD).
              </p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-xs border-slate-200"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || Boolean(emailStatus?.exists)}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tambah User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
