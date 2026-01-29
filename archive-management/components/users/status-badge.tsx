import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "enabled") {
    return (
      <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
        <CheckCircle className="w-3 h-3 mr-1" />
        启用
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
      <XCircle className="w-3 h-3 mr-1" />
      禁用
    </Badge>
  );
}
