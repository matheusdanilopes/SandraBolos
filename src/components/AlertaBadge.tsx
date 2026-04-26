import { AlertTriangle, Clock, Package } from "lucide-react";
import { pedidoAlerta } from "@/lib/utils";

interface Props {
  dataEntrega: string;
  status: string;
  horaEntrega?: string | null;
  horaRetirada?: string | null;
}

export function AlertaBadge({ dataEntrega, status, horaEntrega, horaRetirada }: Props) {
  if (status === "entregue") return null;
  const alerta = pedidoAlerta(dataEntrega, horaEntrega, horaRetirada);
  if (!alerta) return null;

  if (alerta === "atrasado") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle size={11} />
        Atrasado
      </span>
    );
  }

  if (alerta === "entrega_hoje") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Package size={11} />
        Entrega hoje
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
