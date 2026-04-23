import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate, formatPhone } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { TIPO_LABELS } from "@/types/database";
import { Edit, Phone, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const [{ data: cliente }, { data: pedidos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", params.id).single(),
    supabase.from("pedidos").select("*").eq("cliente_id", params.id).order("data_entrega", { ascending: false }),
  ]);

  if (!cliente) notFound();

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg mb-2">
            {cliente.nome.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{cliente.nome}</h1>
          <a href={`tel:${cliente.telefone}`} className="flex items-center gap-1 text-sm text-brand-600 mt-0.5">
            <Phone size={14} /> {formatPhone(cliente.telefone)}
          </a>
        </div>
        <Link href={`/clientes/${cliente.id}/editar`} className="btn-secondary flex items-center gap-1 text-sm px-3 py-1.5">
          <Edit size={14} /> Editar
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <ShoppingBag size={14} className="text-gray-500" />
          <h2 className="font-semibold text-sm text-gray-700">Pedidos ({pedidos?.length ?? 0})</h2>
        </div>

        {!pedidos?.length ? (
          <div className="card p-6 text-center text-gray-400 text-sm">Nenhum pedido</div>
        ) : (
          <div className="space-y-2">
            {pedidos.map((p) => (
              <Link key={p.id} href={`/pedidos/${p.id}`} className="card p-3 block hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{TIPO_LABELS[p.tipo]}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Entrega: {formatDate(p.data_entrega)}</p>
                {p.descricao && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.descricao}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
