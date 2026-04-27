import { Circle, Loader2, CheckCircle2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, STATUS_LABELS, type StatusPedido } from "@/types/database";

const STATUS_ICONS = {
  novo: Circle,
  produzindo: Loader2,
  feito: CheckCircle2,
  entregue: Package,
} as const;

export function StatusBadge({ status }: { status: StatusPedido }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLORS[status])}>
      <Icon size={10} strokeWidth={2.5} />
      {STATUS_LABELS[status]}
    </span>
  );
}
