import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { EmptyState, LoadingState } from '../../components/PageState'
import { formatCurrency, request, sendJson } from '../../lib/api'
import type { Cliente, ItemPedido, Pedido, PedidoDetalhe, Produto } from '../../types/farmacia'
import type { ToastMessage } from '../../components/Toast'

type CartItem = { idProduto: number; descricao: string; qtdProduto: number; precoUnit: number }

export function PedidosPage({ notify }: { notify: (message: ToastMessage) => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [clientId, setClientId] = useState('')
  const [cartProductId, setCartProductId] = useState('')
  const [cartQty, setCartQty] = useState('1')
  const [cart, setCart] = useState<CartItem[]>([])
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<PedidoDetalhe | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [addProductId, setAddProductId] = useState('')
  const [addQty, setAddQty] = useState('1')
  const [editingProduct, setEditingProduct] = useState<number | null>(null)
  const [editQty, setEditQty] = useState('1')
  const [editPrice, setEditPrice] = useState('0')

  async function load() {
    setLoading(true)
    try {
      const [orderRows, clientRows, productRows] = await Promise.all([request<Pedido[]>('/pedidos'), request<Cliente[]>('/clientes'), request<Produto[]>('/produtos')])
      setPedidos(orderRows ?? []); setClientes(clientRows ?? []); setProdutos(productRows ?? [])
    } catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao carregar pedidos.' }) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    Promise.all([request<Pedido[]>('/pedidos'), request<Cliente[]>('/clientes'), request<Produto[]>('/produtos')])
      .then(([orderRows, clientRows, productRows]) => {
        if (active) { setPedidos(orderRows ?? []); setClientes(clientRows ?? []); setProdutos(productRows ?? []) }
      })
      .catch((error: unknown) => { if (active) notify({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao carregar pedidos.' }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [notify])

  const totalCart = useMemo(() => cart.reduce((sum, item) => sum + item.qtdProduto * Number(item.precoUnit), 0), [cart])
  const totalDetail = useMemo(() => detail?.itens.reduce((sum, item) => sum + item.qtdProduto * Number(item.precoUnit), 0) ?? 0, [detail])
  const availableProducts = produtos.filter((produto) => produto.qtdEstoque > 0)

  function addToCart() {
    const product = produtos.find((item) => item.idProduto === Number(cartProductId))
    const quantity = Number(cartQty)
    if (!product || quantity < 1) return
    const inCart = cart.find((item) => item.idProduto === product.idProduto)
    if ((inCart?.qtdProduto ?? 0) + quantity > product.qtdEstoque) { notify({ type: 'error', text: `Estoque disponível para ${product.descricao}: ${product.qtdEstoque} unidade(s).` }); return }
    setCart(inCart ? cart.map((item) => item.idProduto === product.idProduto ? { ...item, qtdProduto: item.qtdProduto + quantity } : item) : [...cart, { idProduto: product.idProduto, descricao: product.descricao, qtdProduto: quantity, precoUnit: Number(product.preco) }])
    setCartProductId(''); setCartQty('1')
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientId || cart.length === 0) return
    setSaving(true)
    try {
      await request('/pedidos', sendJson('POST', { idCliente: Number(clientId), itens: cart.map(({ idProduto, qtdProduto, precoUnit }) => ({ idProduto, qtdProduto, precoUnit })) }))
      notify({ type: 'success', text: 'Pedido criado e estoque atualizado.' }); setCreating(false); setCart([]); setClientId(''); await load()
    } catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível criar o pedido.' }); await load() }
    finally { setSaving(false) }
  }

  async function openDetail(order: Pedido) {
    setDetailLoading(true)
    try { setDetail(await request<PedidoDetalhe>(`/pedidos/${order.idVenda}`)) }
    catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível abrir o pedido.' }) }
    finally { setDetailLoading(false) }
  }

  async function refreshDetail() {
    if (!detail) return
    try { setDetail(await request<PedidoDetalhe>(`/pedidos/${detail.pedido.idVenda}`)); await load() }
    catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.' }) }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!detail || !addProductId) return
    const product = produtos.find((item) => item.idProduto === Number(addProductId))
    if (!product) return
    try {
      await request(`/pedidos/${detail.pedido.idVenda}/itens`, sendJson('POST', { idProduto: product.idProduto, qtdProduto: Number(addQty), precoUnit: Number(product.preco) }))
      notify({ type: 'success', text: 'Item adicionado ao pedido.' }); setAddProductId(''); setAddQty('1'); await refreshDetail()
    } catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível adicionar o item.' }); await load() }
  }

  function beginEdit(item: ItemPedido) { setEditingProduct(item.idProduto); setEditQty(String(item.qtdProduto)); setEditPrice(String(item.precoUnit)) }
  async function saveItem(item: ItemPedido) {
    if (!detail) return
    try {
      await request(`/itens/${detail.pedido.idVenda}/${item.idProduto}`, sendJson('PUT', { qtdProduto: Number(editQty), precoUnit: Number(editPrice) }))
      notify({ type: 'success', text: 'Item do pedido atualizado.' }); setEditingProduct(null); await refreshDetail()
    } catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível atualizar o item.' }) }
  }
  async function removeItem(item: ItemPedido) {
    if (!detail || !window.confirm(`Remover ${item.descricao ?? 'este produto'} do pedido?`)) return
    try {
      await request(`/itens/${detail.pedido.idVenda}/${item.idProduto}`, sendJson('DELETE'))
      notify({ type: 'success', text: 'Item removido do pedido.' }); await refreshDetail()
    } catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível remover o item.' }) }
  }

  return <section className="page-content">
    <div className="page-heading"><div><span className="eyebrow">VENDAS</span><h1>Pedidos</h1><p>Acompanhe as vendas e gerencie os itens de cada pedido.</p></div><button className="button button-primary" onClick={() => { setCart([]); setClientId(''); setCreating(true) }}><Icon name="plus" /> Novo pedido</button></div>
    <div className="metric-row order-metrics"><article className="metric-card"><span className="metric-label">Pedidos registrados</span><strong>{pedidos.length}</strong><span className="metric-caption">Vendas no sistema</span></article><article className="metric-card"><span className="metric-label">Clientes atendidos</span><strong>{new Set(pedidos.map((pedido) => pedido.idCliente)).size}</strong><span className="metric-caption">Clientes com compras</span></article><article className="metric-card"><span className="metric-label">Itens disponíveis</span><strong>{availableProducts.length}</strong><span className="metric-caption">Produtos com estoque</span></article></div>
    <div className="panel table-panel"><div className="panel-heading"><div><h2>Histórico de pedidos</h2><p>Selecione uma venda para ver ou editar os itens.</p></div><button className="icon-button" title="Atualizar lista" onClick={() => void load()}><Icon name="refresh" /></button></div><div className="table-scroll"><table><thead><tr><th>PEDIDO</th><th>CLIENTE</th><th>DATA</th><th>STATUS</th><th></th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5}><LoadingState /></td></tr> : [...pedidos].sort((a, b) => (a.nomeCliente ?? '').localeCompare(b.nomeCliente ?? '', 'pt-BR')).map((pedido) => <tr key={pedido.idVenda}><td><span className="code-tag">VD-{String(pedido.idVenda).padStart(4, '0')}</span></td><td><div className="person-cell"><span className="avatar avatar-green">{pedido.nomeCliente?.slice(0, 1).toUpperCase() ?? 'C'}</span><strong>{pedido.nomeCliente ?? `Cliente #${pedido.idCliente}`}</strong></div></td><td>{new Date(pedido.dataVenda).toLocaleDateString('pt-BR')}</td><td><span className="status-pill status-ok"><i />Concluído</span></td><td><button className="button button-small button-outline" onClick={() => void openDetail(pedido)}>Ver detalhes <Icon name="chevron" /></button></td></tr>)}
      {!loading && pedidos.length === 0 && <tr><td colSpan={5}><EmptyState title="Nenhum pedido por aqui" description="Crie um pedido para registrar a primeira venda." /></td></tr>}
    </tbody></table></div></div>

    {creating && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false) }}><section className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="order-modal-title"><div className="modal-header"><div><span className="eyebrow">REGISTRAR VENDA</span><h2 id="order-modal-title">Novo pedido</h2></div><button className="icon-button" onClick={() => setCreating(false)} aria-label="Fechar"><Icon name="close" /></button></div><form onSubmit={createOrder}><label>Cliente<select value={clientId} onChange={(event) => setClientId(event.target.value)} required><option value="">Selecione um cliente</option>{clientes.map((cliente) => <option key={cliente.idCliente} value={cliente.idCliente}>{cliente.nome} · {cliente.cpf}</option>)}</select></label><div className="form-section-label">Itens do pedido</div><div className="add-item-row"><label className="grow-field">Produto<select value={cartProductId} onChange={(event) => setCartProductId(event.target.value)}><option value="">Selecione um produto</option>{availableProducts.map((produto) => <option key={produto.idProduto} value={produto.idProduto}>{produto.descricao} · {produto.qtdEstoque} un. · {formatCurrency(produto.preco)}</option>)}</select></label><label className="quantity-field">Qtd.<input type="number" min="1" value={cartQty} onChange={(event) => setCartQty(event.target.value)} /></label><button type="button" className="button button-outline add-line-button" onClick={addToCart}><Icon name="plus" /> Adicionar</button></div><div className="cart-list">{cart.length === 0 ? <div className="cart-empty">Adicione ao menos um produto para continuar.</div> : cart.map((item) => <div className="cart-line" key={item.idProduto}><span><strong>{item.descricao}</strong><small>{item.qtdProduto} × {formatCurrency(item.precoUnit)}</small></span><strong>{formatCurrency(item.qtdProduto * Number(item.precoUnit))}</strong><button type="button" className="icon-button danger-icon" aria-label={`Remover ${item.descricao}`} onClick={() => setCart(cart.filter((entry) => entry.idProduto !== item.idProduto))}><Icon name="trash" /></button></div>)}</div><div className="order-total"><span>Total estimado</span><strong>{formatCurrency(totalCart)}</strong></div><p className="form-note">O estoque será atualizado automaticamente ao registrar a venda.</p><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setCreating(false)}>Cancelar</button><button className="button button-primary" disabled={saving || !clientId || cart.length === 0}>{saving ? 'Registrando...' : 'Finalizar pedido'}</button></div></form></section></div>}

    {(detail || detailLoading) && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null) }}><section className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="detail-title"><div className="modal-header"><div><span className="eyebrow">DETALHES DA VENDA</span><h2 id="detail-title">Pedido {detail ? `#${detail.pedido.idVenda}` : ''}</h2></div><button className="icon-button" onClick={() => setDetail(null)} aria-label="Fechar"><Icon name="close" /></button></div>{detailLoading || !detail ? <LoadingState /> : <><div className="detail-summary"><span><small>CLIENTE</small><strong>{detail.pedido.nomeCliente ?? `Cliente #${detail.pedido.idCliente}`}</strong></span><span><small>DATA</small><strong>{new Date(detail.pedido.dataVenda).toLocaleString('pt-BR')}</strong></span><span><small>TOTAL</small><strong>{formatCurrency(totalDetail)}</strong></span></div><div className="form-section-label">Produtos vendidos</div><div className="detail-items">{detail.itens.map((item) => <div className="detail-item" key={item.idProduto}><div className="detail-product"><span className="product-icon"><Icon name="pill" /></span><div><strong>{item.descricao ?? `Produto #${item.idProduto}`}</strong><small>{item.qtdProduto} × {formatCurrency(item.precoUnit)}</small></div></div>{editingProduct === item.idProduto ? <div className="inline-edit"><label>Qtd.<input type="number" min="1" value={editQty} onChange={(event) => setEditQty(event.target.value)} /></label><label>Preço<input type="number" min="0" step="0.01" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} /></label><button className="icon-button save-icon" onClick={() => void saveItem(item)} aria-label="Salvar alterações"><Icon name="check" /></button><button className="icon-button" onClick={() => setEditingProduct(null)} aria-label="Cancelar edição"><Icon name="close" /></button></div> : <><strong className="detail-subtotal">{formatCurrency(item.qtdProduto * Number(item.precoUnit))}</strong><div className="row-actions"><button className="icon-button" title="Editar item" onClick={() => beginEdit(item)}><Icon name="edit" /></button><button className="icon-button danger-icon" title="Remover item" onClick={() => void removeItem(item)}><Icon name="trash" /></button></div></>}</div>)}{detail.itens.length === 0 && <div className="cart-empty">Este pedido ainda não possui itens.</div>}</div><form className="add-order-item" onSubmit={addItem}><span className="form-section-label">Adicionar item</span><div className="add-item-row"><label className="grow-field"><span className="sr-only">Produto</span><select value={addProductId} onChange={(event) => setAddProductId(event.target.value)} required><option value="">Selecione um produto com estoque</option>{availableProducts.filter((produto) => !detail.itens.some((item) => item.idProduto === produto.idProduto)).map((produto) => <option key={produto.idProduto} value={produto.idProduto}>{produto.descricao} · {produto.qtdEstoque} un.</option>)}</select></label><label className="quantity-field"><span className="sr-only">Quantidade</span><input type="number" min="1" value={addQty} onChange={(event) => setAddQty(event.target.value)} /></label><button className="button button-outline"><Icon name="plus" /> Adicionar</button></div></form><div className="modal-actions"><button className="button button-quiet" onClick={() => setDetail(null)}>Fechar</button></div></>}</section></div>}
  </section>
}
