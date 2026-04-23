export type TipoPedido = "bolo" | "doce" | "kit";
export type StatusPedido = "novo" | "produzindo" | "feito" | "entregue";
export type Topper = "sim" | "nao" | "brinde";

// Application-level types (Row without join fields)
export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
}

export interface Pedido {
  id: string;
  cliente_id: string | null;
  data_entrega: string;
  tipo: TipoPedido;
  descricao: string | null;
  topper: Topper;
  status: StatusPedido;
  peso: number | null;
  quantidade: number | null;
  preco_por_kg: number | null;
  valor_calculado: number | null;
  preco_corrigido: number | null;
  valor_cobrado: number | null;
  created_at: string;
}

export interface PedidoComCliente extends Pedido {
  clientes?: { nome: string; telefone: string } | null;
}

export interface ImagemPedido {
  id: string;
  pedido_id: string;
  file_id: string;
  url: string;
  nome_arquivo: string;
  created_at: string;
}

// Supabase Database type — must conform to GenericSchema structure
export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: Cliente;
        Insert: Omit<Cliente, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Cliente, "id" | "created_at">>;
        Relationships: [];
      };
      pedidos: {
        Row: Pedido;
        Insert: Omit<Pedido, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<Pedido, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          }
        ];
      };
      imagens_pedido: {
        Row: ImagemPedido;
        Insert: Omit<ImagemPedido, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ImagemPedido, "id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "imagens_pedido_pedido_id_fkey";
            columns: ["pedido_id"];
            isOneToOne: false;
            referencedRelation: "pedidos";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export const STATUS_LABELS: Record<StatusPedido, string> = {
  novo: "Novo",
  produzindo: "Produzindo",
  feito: "Feito",
  entregue: "Entregue",
};

export const STATUS_FLOW: Record<StatusPedido, StatusPedido | null> = {
  novo: "produzindo",
  produzindo: "feito",
  feito: "entregue",
  entregue: null,
};

export const STATUS_COLORS: Record<StatusPedido, string> = {
  novo: "bg-blue-100 text-blue-800",
  produzindo: "bg-yellow-100 text-yellow-800",
  feito: "bg-green-100 text-green-800",
  entregue: "bg-gray-100 text-gray-600",
};

export const TIPO_LABELS: Record<TipoPedido, string> = {
  bolo: "Bolo",
  doce: "Doce",
  kit: "Kit",
};

export const TOPPER_LABELS: Record<Topper, string> = {
  sim: "Sim",
  nao: "Não",
  brinde: "Brinde",
};
