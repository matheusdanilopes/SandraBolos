// App-level types used across components
export type TipoPedido = "bolo" | "doce" | "kit";
export type StatusPedido = "novo" | "produzindo" | "feito" | "entregue";
export type Topper = "sim" | "nao" | "brinde";
export type TipoCusto = "ingrediente" | "embalagem" | "mao_de_obra" | "custo_fixo" | "outros";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
}

export interface Pedido {
  id: string;
  cliente_id: string | null;
  nome_cliente: string | null;
  drive_folder_id: string | null;
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

export interface Custo {
  id: string;
  pedido_id: string | null;
  tipo: TipoCusto;
  descricao: string;
  valor: number;
  data: string;
  created_at: string;
}

export interface CustoComPedido extends Custo {
  pedidos?: { nome_cliente: string | null; descricao: string | null } | null;
}

export interface ImagemPedido {
  id: string;
  pedido_id: string;
  file_id: string;
  url: string;
  nome_arquivo: string;
  created_at: string;
}

// Database type matching Supabase codegen output exactly.
// Row/Insert/Update use plain string for DB enum columns (tipo, topper, status)
// to avoid assignability issues with union types vs Record<string, unknown>.
export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nome: string
          telefone: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          telefone: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          telefone?: string
          created_at?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          id: string
          cliente_id: string | null
          nome_cliente: string | null
          drive_folder_id: string | null
          data_entrega: string
          tipo: string
          descricao: string | null
          topper: string
          status: string
          peso: number | null
          quantidade: number | null
          preco_por_kg: number | null
          valor_calculado: number | null
          preco_corrigido: number | null
          valor_cobrado: number | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id?: string | null
          nome_cliente?: string | null
          drive_folder_id?: string | null
          data_entrega: string
          tipo: string
          descricao?: string | null
          topper?: string
          status?: string
          peso?: number | null
          quantidade?: number | null
          preco_por_kg?: number | null
          valor_calculado?: number | null
          preco_corrigido?: number | null
          valor_cobrado?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string | null
          nome_cliente?: string | null
          drive_folder_id?: string | null
          data_entrega?: string
          tipo?: string
          descricao?: string | null
          topper?: string
          status?: string
          peso?: number | null
          quantidade?: number | null
          preco_por_kg?: number | null
          valor_calculado?: number | null
          preco_corrigido?: number | null
          valor_cobrado?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          }
        ]
      }
      imagens_pedido: {
        Row: {
          id: string
          pedido_id: string
          file_id: string
          url: string
          nome_arquivo: string
          created_at: string
        }
        Insert: {
          id?: string
          pedido_id: string
          file_id: string
          url: string
          nome_arquivo: string
          created_at?: string
        }
        Update: {
          id?: string
          pedido_id?: string
          file_id?: string
          url?: string
          nome_arquivo?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          }
        ]
      }
      custos: {
        Row: {
          id: string
          pedido_id: string | null
          tipo: string
          descricao: string
          valor: number
          data: string
          created_at: string
        }
        Insert: {
          id?: string
          pedido_id?: string | null
          tipo?: string
          descricao: string
          valor: number
          data: string
          created_at?: string
        }
        Update: {
          id?: string
          pedido_id?: string | null
          tipo?: string
          descricao?: string
          valor?: number
          data?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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

export const TIPO_CUSTO_LABELS: Record<TipoCusto, string> = {
  ingrediente: "Ingrediente",
  embalagem: "Embalagem",
  mao_de_obra: "Mão de obra",
  custo_fixo: "Custo fixo",
  outros: "Outros",
};

export const TIPO_CUSTO_COLORS: Record<TipoCusto, string> = {
  ingrediente: "bg-amber-100 text-amber-800",
  embalagem: "bg-blue-100 text-blue-800",
  mao_de_obra: "bg-purple-100 text-purple-800",
  custo_fixo: "bg-gray-100 text-gray-700",
  outros: "bg-slate-100 text-slate-700",
};
