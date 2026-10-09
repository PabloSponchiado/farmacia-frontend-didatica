export interface Cliente {
  idCliente: number
  nome: string
  cpf: string
}

export interface Produto {
  idProduto: number
  descricao: string
  validade: string | null
  preco: number | string
  qtdEstoque: number
  qtdMinEstoque: number
  emAlerta?: boolean
}

export interface Pedido {
  idVenda: number
  idCliente: number
  nomeCliente?: string
  dataVenda: string
}

export interface ItemPedido {
  idProduto: number
  descricao?: string
  qtdProduto: number
  precoUnit: number | string
}

export interface PedidoDetalhe {
  pedido: Pedido
  itens: ItemPedido[]
}
