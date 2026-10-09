import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Toast, type ToastMessage } from '../components/Toast'
import { ClientesPage } from '../features/clientes/ClientesPage'
import { PedidosPage } from '../features/pedidos/PedidosPage'
import { ProdutosPage } from '../features/produtos/ProdutosPage'
import { request } from '../lib/api'
import type { Cliente, Pedido, Produto } from '../types/farmacia'
import '../styles/app.css'

type Section = 'inicio' | 'produtos' | 'clientes' | 'pedidos'
const navItems: { id: Section; label: string; icon: 'grid' | 'box' | 'users' | 'receipt' }[] = [
  { id: 'inicio', label: 'Visão geral', icon: 'grid' },
  { id: 'produtos', label: 'Produtos', icon: 'box' },
  { id: 'clientes', label: 'Clientes', icon: 'users' },
  { id: 'pedidos', label: 'Pedidos', icon: 'receipt' },
]

function Dashboard({ navigate, notify }: { navigate: (section: Section) => void; notify: (message: ToastMessage) => void }) {
  const [data, setData] = useState<{ produtos: Produto[]; clientes: Cliente[]; pedidos: Pedido[] } | null>(null)
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    let active = true
    Promise.all([request<Produto[]>('/produtos'), request<Cliente[]>('/clientes'), request<Pedido[]>('/pedidos')])
      .then(([produtos, clientes, pedidos]) => { if (active) setData({ produtos: produtos ?? [], clientes: clientes ?? [], pedidos: pedidos ?? [] }) })
      .catch((error: unknown) => { if (active) { setOffline(true); notify({ type: 'error', text: error instanceof Error ? error.message : 'API indisponível.' }) } })
    return () => { active = false }
  }, [notify])

  const alerts = data?.produtos.filter((produto) => produto.emAlerta ?? produto.qtdEstoque <= produto.qtdMinEstoque) ?? []
  const recentOrders = [...(data?.pedidos ?? [])].sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime()).slice(0, 5)
  return <section className="page-content dashboard-content">
    <div className="welcome-banner"><div className="welcome-copy"><span className="eyebrow">PAINEL DE CONTROLE</span><h1>Bom dia! <span>☀️</span></h1><p>Veja o resumo da sua farmácia e acompanhe o que precisa de atenção.</p><div className="welcome-actions"><button className="button button-light" onClick={() => navigate('pedidos')}><Icon name="plus" /> Novo pedido</button><button className="button button-banner-quiet" onClick={() => navigate('produtos')}>Ver produtos <Icon name="arrow" /></button></div></div><div className="welcome-art"><div className="art-circle"><Icon name="pill" /></div><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✳</span><span className="art-pill">SAÚDE<br/>EM DIA</span></div><div className="banner-orb orb-one"/><div className="banner-orb orb-two"/></div>
    <div className="dashboard-section-heading"><div><h2>Resumo da operação</h2><p>Indicadores atualizados com os dados da API.</p></div><span className={`api-indicator ${offline ? 'api-offline' : data ? 'api-online' : ''}`}><i />{offline ? 'API desconectada' : data ? 'API conectada' : 'Conectando à API'}</span></div>
    <div className="metric-row dashboard-metrics"><button className="metric-card metric-clickable" onClick={() => navigate('produtos')}><span className="metric-label">Produtos no catálogo</span><strong>{data?.produtos.length ?? '—'}</strong><span className="metric-caption">Acesse o inventário <Icon name="arrow" /></span><span className="metric-icon metric-icon-purple"><Icon name="box" /></span></button><button className="metric-card metric-clickable" onClick={() => navigate('clientes')}><span className="metric-label">Clientes cadastrados</span><strong>{data?.clientes.length ?? '—'}</strong><span className="metric-caption">Veja sua base de clientes <Icon name="arrow" /></span><span className="metric-icon metric-icon-green"><Icon name="users" /></span></button><button className={`metric-card metric-clickable ${alerts.length ? 'metric-warning' : ''}`} onClick={() => navigate('produtos')}><span className="metric-label">Alertas de estoque</span><strong>{data ? alerts.length : '—'}</strong><span className="metric-caption">Itens que precisam de reposição <Icon name="arrow" /></span><span className="metric-icon metric-icon-orange"><Icon name="alert" /></span></button><button className="metric-card metric-clickable" onClick={() => navigate('pedidos')}><span className="metric-label">Pedidos realizados</span><strong>{data?.pedidos.length ?? '—'}</strong><span className="metric-caption">Histórico de vendas <Icon name="arrow" /></span><span className="metric-icon metric-icon-blue"><Icon name="receipt" /></span></button></div>
    <div className="dashboard-columns"><div className="panel recent-panel"><div className="panel-heading"><div><h2>Pedidos recentes</h2><p>Últimas vendas registradas.</p></div><button className="text-button" onClick={() => navigate('pedidos')}>Ver todos <Icon name="arrow" /></button></div>{!data ? <div className="dashboard-loading"><span className="spinner"/> Carregando pedidos...</div> : recentOrders.length ? <div className="recent-list">{recentOrders.map((order) => <div className="recent-row" key={order.idVenda}><span className="recent-order-icon"><Icon name="cart" /></span><div className="recent-info"><strong>{order.nomeCliente ?? `Cliente #${order.idCliente}`}</strong><small>Pedido VD-{String(order.idVenda).padStart(4, '0')} · {new Date(order.dataVenda).toLocaleDateString('pt-BR')}</small></div><span className="status-pill status-ok"><i/>Concluído</span></div>)}</div> : <div className="dashboard-empty">Nenhum pedido registrado ainda.</div>}</div>
      <div className="panel alert-panel"><div className="panel-heading"><div><h2>Estoque em atenção <span className="count-bubble">{data ? alerts.length : '—'}</span></h2><p>Produtos no limite ou abaixo do mínimo.</p></div><button className="icon-button" title="Ir para produtos" onClick={() => navigate('produtos')}><Icon name="chevron" /></button></div>{!data ? <div className="dashboard-loading"><span className="spinner"/></div> : alerts.length ? <div className="alert-list">{alerts.slice(0, 4).map((produto) => <div className="alert-row" key={produto.idProduto}><span className="alert-product-icon"><Icon name="pill" /></span><div><strong>{produto.descricao}</strong><small>{produto.qtdEstoque} un. restantes · mínimo {produto.qtdMinEstoque}</small></div><Icon name="alert" className="alert-row-mark" /></div>)}<button className="text-button alert-see-all" onClick={() => navigate('produtos')}>Ver inventário <Icon name="arrow" /></button></div> : <div className="all-good"><span><Icon name="check" /></span><strong>Tudo em ordem</strong><p>Nenhum produto precisa de reposição agora.</p></div>}</div></div>
    <div className="dashboard-footer"><span><Icon name="pill" /> Farmácia <strong>BemViver</strong></span><span>Gestão simples, cuidado de verdade.</span></div>
  </section>
}

function App() {
  const [section, setSection] = useState<Section>('inicio')
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const notify = useCallback((message: ToastMessage) => setToast(message), [])
  const currentTitle = navItems.find((item) => item.id === section)?.label ?? 'Visão geral'

  return <div className="app-shell">
    {mobileNavOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)} />}
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}><button className="brand" onClick={() => { setSection('inicio'); setMobileNavOpen(false) }}><span className="brand-mark"><Icon name="pill" /></span><span className="brand-name">bem<span>viver</span><small>GESTÃO FARMACÊUTICA</small></span></button><div className="sidebar-label">MENU PRINCIPAL</div><nav className="main-nav" aria-label="Navegação principal">{navItems.map((item) => <button key={item.id} className={`nav-link ${section === item.id ? 'nav-active' : ''}`} onClick={() => { setSection(item.id); setMobileNavOpen(false) }}><Icon name={item.icon} /><span>{item.label}</span>{section === item.id && <span className="nav-marker" />}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><Icon name="check" /></span><strong>Precisa de ajuda?</strong><p>O sistema está pronto para acompanhar sua rotina.</p><span className="help-status"><i/> Sistema operacional</span></div><div className="sidebar-version"><span>●</span> Farmácia Didática <small>v1.0</small></div></div></aside>
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button><div className="breadcrumbs"><span>BemViver</span><Icon name="chevron"/><strong>{currentTitle}</strong></div><div className="topbar-right"><span className="today-label">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span><span className="topbar-divider"/><span className="user-avatar">BV</span><div className="user-details"><strong>Equipe da farmácia</strong><small>Administrador</small></div></div></header><div className="page-stage">{section === 'inicio' && <Dashboard navigate={setSection} notify={notify} />}{section === 'produtos' && <ProdutosPage notify={notify} />}{section === 'clientes' && <ClientesPage notify={notify} />}{section === 'pedidos' && <PedidosPage notify={notify} />}</div></main>
    {toast && <Toast message={toast} onClose={() => setToast(null)} />}
  </div>
}

export default App
