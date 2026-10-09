import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { EmptyState, LoadingState } from '../../components/PageState'
import { request, sendJson } from '../../lib/api'
import type { Cliente } from '../../types/farmacia'
import type { ToastMessage } from '../../components/Toast'

export function ClientesPage({ notify }: { notify: (message: ToastMessage) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try { setClientes(await request<Cliente[]>('/clientes') ?? []) }
    catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao carregar clientes.' }) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    request<Cliente[]>('/clientes').then((rows) => { if (active) setClientes(rows ?? []) })
      .catch((error: unknown) => { if (active) notify({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao carregar clientes.' }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [notify])

  const filtered = useMemo(() => clientes.filter((cliente) => `${cliente.nome} ${cliente.cpf} ${cliente.idCliente}`.toLowerCase().includes(query.toLowerCase())), [clientes, query])

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    try {
      await request('/clientes', sendJson('POST', { nome: String(data.get('nome')).trim(), cpf: String(data.get('cpf')).trim() }))
      notify({ type: 'success', text: 'Cliente cadastrado com sucesso.' })
      setCreating(false)
      event.currentTarget.reset()
      await load()
    } catch (error) { notify({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível cadastrar o cliente.' }) }
    finally { setSaving(false) }
  }

  return <section className="page-content">
    <div className="page-heading"><div><span className="eyebrow">RELACIONAMENTO</span><h1>Clientes</h1><p>Consulte e cadastre os clientes da farmácia.</p></div><button className="button button-primary" onClick={() => setCreating(true)}><Icon name="plus" /> Novo cliente</button></div>
    <div className="toolbar"><div className="search-box"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') setQuery(search) }} placeholder="Buscar por nome, CPF ou código" /><button className="search-submit" onClick={() => setQuery(search)}>Buscar</button></div><span className="result-count">{filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}</span></div>
    <div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>CLIENTE</th><th>CPF</th><th>CÓDIGO</th><th>CADASTRO</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={4}><LoadingState /></td></tr> : filtered.map((cliente) => <tr key={cliente.idCliente}><td><div className="person-cell"><span className="avatar">{cliente.nome?.slice(0, 1).toUpperCase()}</span><strong>{cliente.nome}</strong></div></td><td className="mono">{cliente.cpf}</td><td><span className="code-tag">CL-{String(cliente.idCliente).padStart(4, '0')}</span></td><td className="muted-cell">Cliente cadastrado</td></tr>)}
      {!loading && filtered.length === 0 && <tr><td colSpan={4}><EmptyState title={query ? 'Nenhum resultado encontrado' : 'Sua lista está vazia'} description={query ? 'Tente buscar por outro nome ou CPF.' : 'Cadastre o primeiro cliente para começar.'} /></td></tr>}
    </tbody></table></div></div>
    {creating && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreating(false) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title"><div className="modal-header"><div><span className="eyebrow">NOVO REGISTRO</span><h2 id="client-modal-title">Cadastrar cliente</h2></div><button className="icon-button" onClick={() => setCreating(false)} aria-label="Fechar"><Icon name="close" /></button></div><form onSubmit={createClient}><label>Nome completo<input name="nome" required maxLength={80} placeholder="Ex.: Maria Oliveira" autoFocus /></label><label>CPF<input name="cpf" required maxLength={14} placeholder="000.000.000-00" pattern="[0-9.\\-]{11,14}" title="Informe um CPF com até 14 caracteres" /></label><p className="form-note">O CPF precisa ser único e será usado para identificar o cliente.</p><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setCreating(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar cliente'}</button></div></form></section></div>}
  </section>
}
