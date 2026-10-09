import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { EmptyState, LoadingState } from '../../components/PageState'
import { formatCurrency, request, sendJson } from '../../lib/api'
import type { Produto } from '../../types/farmacia'
import type { ToastMessage } from '../../components/Toast'

const emptyForm = { descricao: '', validade: '', preco: '', qtdEstoque: '', qtdMinEstoque: '' }
type ProductForm = typeof emptyForm

export function ProdutosPage({ notify }: { notify: (message: ToastMessage) => void }) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [alertsOnly, setAlertsOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try { setProdutos(await request<Produto[]>('/produtos') ?? []) }
    catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao carregar produtos.' }) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    request<Produto[]>('/produtos').then((rows) => { if (active) setProdutos(rows ?? []) })
      .catch((error: unknown) => { if (active) notify({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao carregar produtos.' }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [notify])

  const alertCount = produtos.filter((produto) => produto.emAlerta ?? produto.qtdEstoque <= produto.qtdMinEstoque).length
  const filtered = useMemo(() => produtos.filter((produto) => {
    const matchesText = `${produto.descricao} ${produto.idProduto}`.toLowerCase().includes(query.toLowerCase())
    const isAlert = produto.emAlerta ?? produto.qtdEstoque <= produto.qtdMinEstoque
    return matchesText && (!alertsOnly || isAlert)
  }), [produtos, query, alertsOnly])

  function startEdit(produto: Produto) {
    setEditingId(produto.idProduto)
    setFormOpen(true)
    setForm({ descricao: produto.descricao, validade: produto.validade?.slice(0, 10) ?? '', preco: String(produto.preco), qtdEstoque: String(produto.qtdEstoque), qtdMinEstoque: String(produto.qtdMinEstoque) })
  }
  function startCreate() { setEditingId(null); setForm(emptyForm); setFormOpen(true) }
  function closeForm() { setEditingId(null); setForm(emptyForm); setFormOpen(false) }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = { descricao: form.descricao.trim(), validade: form.validade || null, preco: Number(form.preco), qtdEstoque: Number(form.qtdEstoque), qtdMinEstoque: Number(form.qtdMinEstoque) }
    setSaving(true)
    try {
      if (editingId === null) await request('/produtos', sendJson('POST', payload))
      else await request(`/produtos/${editingId}`, sendJson('PUT', payload))
      notify({ type: 'success', text: editingId === null ? 'Produto cadastrado com sucesso.' : 'Produto atualizado com sucesso.' })
      closeForm()
      await load()
    } catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível salvar o produto.' }) }
    finally { setSaving(false) }
  }

  return <section className="page-content">
    <div className="page-heading"><div><span className="eyebrow">CATÁLOGO E ESTOQUE</span><h1>Produtos</h1><p>Gerencie o catálogo e acompanhe a disponibilidade dos medicamentos.</p></div><button className="button button-primary" onClick={startCreate}><Icon name="plus" /> Novo produto</button></div>
    <div className="metric-row"><article className="metric-card"><span className="metric-label">Produtos cadastrados</span><strong>{produtos.length}</strong><span className="metric-caption">Itens no catálogo</span></article><article className={`metric-card ${alertCount ? 'metric-warning' : ''}`}><span className="metric-label">Estoque em atenção</span><strong>{alertCount}</strong><span className="metric-caption">Abaixo do mínimo configurado</span><span className="metric-icon"><Icon name="alert" /></span></article><article className="metric-card"><span className="metric-label">Unidades em estoque</span><strong>{produtos.reduce((sum, produto) => sum + produto.qtdEstoque, 0)}</strong><span className="metric-caption">Somatório do inventário</span></article></div>
    <div className="panel inventory-panel"><div className="panel-heading"><div><h2>Inventário</h2><p>Os produtos em alerta aparecem destacados.</p></div><button className={`button ${alertsOnly ? 'button-warning' : 'button-outline'}`} onClick={() => setAlertsOnly(!alertsOnly)}><Icon name="alert" />{alertsOnly ? 'Ver todos' : `Alertas${alertCount ? ` · ${alertCount}` : ''}`}</button></div>
      <div className="toolbar inventory-toolbar"><div className="search-box"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setQuery(search) }} placeholder="Buscar medicamento" /><button className="search-submit" onClick={() => setQuery(search)}>Buscar</button></div><button className="icon-button reload-button" title="Atualizar lista" onClick={() => void load()}><Icon name="refresh" /></button></div>
      <div className="table-scroll"><table><thead><tr><th>PRODUTO</th><th>PREÇO</th><th>ESTOQUE</th><th>VALIDADE</th><th>STATUS</th><th></th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6}><LoadingState /></td></tr> : filtered.map((produto) => { const alert = produto.emAlerta ?? produto.qtdEstoque <= produto.qtdMinEstoque; return <tr key={produto.idProduto}><td><div className="product-cell"><span className="product-icon"><Icon name="pill" /></span><div><strong>{produto.descricao}</strong><small>MED-{String(produto.idProduto).padStart(4, '0')}</small></div></div></td><td className="price-cell">{formatCurrency(produto.preco)}</td><td><div className="stock-cell"><strong className={alert ? 'text-warning' : ''}>{produto.qtdEstoque} un.</strong><small>Mínimo: {produto.qtdMinEstoque}</small></div></td><td>{produto.validade ? new Date(`${produto.validade.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR') : '—'}</td><td><span className={`status-pill ${alert ? 'status-warning' : 'status-ok'}`}><i />{alert ? 'Estoque baixo' : 'Disponível'}</span></td><td><button className="icon-button" title="Editar produto" aria-label={`Editar ${produto.descricao}`} onClick={() => startEdit(produto)}><Icon name="edit" /></button></td></tr> })}
        {!loading && filtered.length === 0 && <tr><td colSpan={6}><EmptyState title={alertsOnly ? 'Nenhum alerta de estoque' : 'Nenhum produto encontrado'} description={alertsOnly ? 'Todos os itens estão acima do estoque mínimo.' : 'Altere a busca ou cadastre um produto.'} /></td></tr>}
      </tbody></table></div>
    </div>
    {formOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><div className="modal-header"><div><span className="eyebrow">{editingId === null ? 'NOVO REGISTRO' : `PRODUTO #${editingId}`}</span><h2 id="product-modal-title">{editingId === null ? 'Cadastrar produto' : 'Editar produto'}</h2></div><button className="icon-button" onClick={closeForm} aria-label="Fechar"><Icon name="close" /></button></div><form onSubmit={saveProduct}><label>Descrição<input value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} required maxLength={120} placeholder="Ex.: Analgésico 500mg" autoFocus /></label><div className="form-grid"><label>Preço (R$)<input type="number" min="0" step="0.01" value={form.preco} onChange={(event) => setForm({ ...form, preco: event.target.value })} required /></label><label>Validade<input type="date" value={form.validade} onChange={(event) => setForm({ ...form, validade: event.target.value })} /></label><label>Estoque atual<input type="number" min="0" step="1" value={form.qtdEstoque} onChange={(event) => setForm({ ...form, qtdEstoque: event.target.value })} required /></label><label>Estoque mínimo<input type="number" min="0" step="1" value={form.qtdMinEstoque} onChange={(event) => setForm({ ...form, qtdMinEstoque: event.target.value })} required /></label></div><p className="form-note">O alerta de estoque é ativado quando a quantidade atual fica igual ou abaixo do mínimo.</p><div className="modal-actions"><button type="button" className="button button-quiet" onClick={closeForm}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : editingId === null ? 'Salvar produto' : 'Salvar alterações'}</button></div></form></section></div>}
  </section>
}
