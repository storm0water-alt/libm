"use client";

import { LoadingProvider } from "@/lib/loading-context";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ReactNode } from "react";

interface LoadingProviderWrapperProps {
  username: string;
  role: string;
  userId: string;
  children: ReactNode;
}

export function LoadingProviderWrapper({
  username,
  role,
  userId,
  children,
}: LoadingProviderWrapperProps) {
  return (
    <LoadingProvider>
      <div className="min-h-screen bg-gray-100">
        <div className="flex h-screen">
          {/* Sidebar */}
          <Sidebar
            username={username}
            role={role}
            userId={userId}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Page Content */}
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </div>
      </div>
      <LoadingOverlay />
    </LoadingProvider>
  );
}
