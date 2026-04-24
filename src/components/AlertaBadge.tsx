import { AlertTriangle, Clock } from "lucide-react";
import { pedidoAlerta } from "@/lib/utils";

export function AlertaBadge({ dataEntrega, status }: { dataEntrega: string; status: string }) {
  if (status === "entregue") return null;
  const alerta = pedidoAlerta(dataEntrega);
  if (!alerta) return null;

  if (alerta === "atrasado") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle size={11} />
        Atrasado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
      <Clock size={11} />
      Vence amanhã
    </span>
  );
}
