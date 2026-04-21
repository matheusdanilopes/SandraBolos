export type OrderStatus = 'pendente' | 'em_producao' | 'entregue';

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  created_at: string;
};

export type Pedido = {
  id: string;
  cliente_id: string;
  data_entrega: string;
  valor: number;
  status: OrderStatus;
  observacoes: string | null;
  created_at: string;
  cliente?: Pick<Cliente, 'id' | 'nome' | 'telefone'>;
};

export type ItemPedido = {
  id: string;
  pedido_id: string;
  descricao: string;
  quantidade: number;
  preco: number;
  created_at: string;
};

export type NovoPedidoInput = {
  cliente_id: string;
  data_entrega: string;
  valor: number;
  status: OrderStatus;
  observacoes?: string;
  itens: Array<{
    descricao: string;
    quantidade: number;
    preco: number;
  }>;
};
