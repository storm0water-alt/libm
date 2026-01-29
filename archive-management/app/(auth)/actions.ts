"use server";

import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Server action for handling user logout
 * Logs the operation and redirects to login page
 */
export async function logoutAction() {
  const session = await auth();

  // Optional: Log logout operation if log service exists
  // This will be implemented when the logging system is created
  if (session?.user?.id) {
    // TODO: Add log service call when available
    // await logService.createLog({
    //   operator: session.user.username,
    //   operation: "logout",
    //   target: session.user.username,
    //   ip: "", // Get from request headers
    // });
    console.log(`User logged out: ${session.user.username}`);
  }

  // Sign out and redirect to login
  await signOut({ redirectTo: "/login" });
}
