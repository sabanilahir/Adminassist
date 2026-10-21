"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

export function DownloadExcelButton() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/reports/excel", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download Excel");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-report-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading Excel:", error);
      alert("Failed to download Excel. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      className="w-full"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Excel
        </>
      )}
    </Button>
  );
}