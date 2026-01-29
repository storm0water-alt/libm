import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoadingProviderWrapper } from "@/components/loading-provider-wrapper";

export default async function ArchiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <LoadingProviderWrapper
      username={session.user.username || "用户"}
      role={session.user.role || "user"}
      userId={session.user.id}
    >
      {children}
    </LoadingProviderWrapper>
  );
}
