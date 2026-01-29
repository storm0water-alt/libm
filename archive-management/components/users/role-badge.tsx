import { Badge } from "@/components/ui/badge";
import { Shield, User } from "lucide-react";

interface RoleBadgeProps {
  role: string;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  if (role === "admin") {
    return (
      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
        <Shield className="w-3 h-3 mr-1" />
        管理员
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300">
      <User className="w-3 h-3 mr-1" />
      普通用户
    </Badge>
  );
}
