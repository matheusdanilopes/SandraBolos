import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS, type StatusPedido } from "@/types/database";

export function StatusBadge({ status }: { status: StatusPedido }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
