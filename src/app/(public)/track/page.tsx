"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ArrowRight, LifeBuoy } from "lucide-react";
import Link from "next/link";

export default function TrackSearchPage() {
  const [trackingId, setTrackingId] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = trackingId.trim();
    if (!trimmed) return;
    router.push(`/track/${trimmed}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b bg-white py-4 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="font-semibold text-slate-900 text-sm tracking-tight">
            ASSIST Self-Service Portal
          </span>
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900">
            Internal Staff Login
          </Button>
        </Link>
      </header>

      {/* Main Search Hero */}
      <main className="max-w-xl mx-auto w-full px-4 py-16 flex-1 flex flex-col justify-center text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-700 mx-auto mb-4">
          <LifeBuoy className="h-6 w-6" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Lacak Status Pengaduan Anda
        </h1>
        <p className="text-sm text-slate-500 mt-2 mb-8">
          Masukkan nomor Tracking ID yang Anda terima melalui email konfirmasi untuk memeriksa progres penanganan tiket.
        </p>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Contoh: TKT-202611-12345"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="pl-11 h-12 text-base bg-white border-slate-300 focus:border-slate-900 shadow-sm"
              required
            />
          </div>

          <Button type="submit" className="w-full h-11 bg-slate-900 text-white hover:bg-slate-800 text-sm font-medium">
            Lacak Tiket <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Informasi publik aman dan terenkripsi</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4 text-center text-xs text-slate-400">
        Astragraphia Solution Support System Ticketing (ASSIST) &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
