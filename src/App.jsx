import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import Home from './pages/Home'

// Code splitting: a home carrega no bundle inicial (é a porta de entrada,
// precisa abrir rápido no celular); o resto só é baixado quando visitado.
// Sem isto, o visitante baixava ~440 KB — painéis, admin e tudo — só para
// ver três cartões.
const Busca = lazy(() => import('./pages/Busca'))
const PerfilProfissional = lazy(() => import('./pages/PerfilProfissional'))
const Login = lazy(() => import('./pages/Login'))
const Cadastro = lazy(() => import('./pages/Cadastro'))
const PainelCliente = lazy(() => import('./pages/PainelCliente'))
const PainelProfissional = lazy(() => import('./pages/PainelProfissional'))
const PainelAdmin = lazy(() => import('./pages/PainelAdmin'))

/** Rota que exige login — e opcionalmente um papel específico. */
function Protegida({ children, papel }) {
  const { sessao, perfil, carregando, sair } = useAuth()
  if (carregando) return <div className="loading">Carregando…</div>
  if (!sessao) return <Navigate to="/entrar" replace />

  // Sessão existe mas o perfil não veio. Dois casos:
  //  • ainda buscando -> `carregando` cobre;
  //  • usuário órfão (conta no Auth sem linha em `perfis`) -> sem esta
  //    saída, a pessoa ficava presa num "Carregando…" eterno, sem nem
  //    conseguir deslogar. Aconteceu em teste real.
  if (!perfil) {
    return (
      <div className="wrap" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p className="lead" style={{ marginBottom: 18 }}>
          Não encontramos os dados da sua conta. Saia e entre novamente —
          se o problema continuar, crie a conta de novo.
        </p>
        <button className="btn ghost" onClick={() => sair()}>Sair</button>
      </div>
    )
  }

  if (papel && perfil.role !== papel) {
    // Manda para o painel do papel real, em vez de jogar para a home
    const destino =
      perfil.role === 'profissional' ? '/painel-profissional'
      : perfil.role === 'admin' ? '/admin'
      : '/painel'
    return <Navigate to={destino} replace />
  }
  return children
}

export default function App() {
  return (
    <>
      <Header />
      <Suspense fallback={<div className="loading">Carregando…</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buscar" element={<Busca />} />
          <Route path="/profissional/:id" element={<PerfilProfissional />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/cadastrar" element={<Cadastro />} />
          <Route path="/painel" element={<Protegida papel="cliente"><PainelCliente /></Protegida>} />
          <Route path="/painel-profissional" element={<Protegida papel="profissional"><PainelProfissional /></Protegida>} />
          <Route path="/admin" element={<Protegida papel="admin"><PainelAdmin /></Protegida>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
