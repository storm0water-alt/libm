"use client";

import { useLoading } from "@/lib/loading-context";
import { Loader2 } from "lucide-react";

export function LoadingOverlay() {
  const { isLoading, message } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 flex flex-col items-center gap-4 min-w-[200px]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
}
