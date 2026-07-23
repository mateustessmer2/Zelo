import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Header from './components/Header'
import Home from './pages/Home'
import Busca from './pages/Busca'
import PerfilProfissional from './pages/PerfilProfissional'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import PainelCliente from './pages/PainelCliente'
import PainelProfissional from './pages/PainelProfissional'
import PainelAdmin from './pages/PainelAdmin'

/** Rota que exige login — e opcionalmente um papel específico. */
function Protegida({ children, papel }) {
  const { sessao, perfil, carregando } = useAuth()
  if (carregando) return <div className="loading">Carregando…</div>
  if (!sessao) return <Navigate to="/entrar" replace />
  // Espera o perfil chegar antes de decidir qualquer redirecionamento.
  // Sem isto, `perfil` ainda null derruba a pessoa para a home logo após
  // o cadastro — o insert em `perfis` acontece depois do signUp.
  if (!perfil) return <div className="loading">Carregando…</div>
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
    </>
  )
}
a />} />
        <Route path="/profissional/:id" element={<PerfilProfissional />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/cadastrar" element={<Cadastro />} />
        <Route path="/painel" element={<Protegida papel="cliente"><PainelCliente /></Protegida>} />
        <Route path="/painel-profissional" element={<Protegida papel="profissional"><PainelProfissional /></Protegida>} />
        <Route path="/admin" element={<Protegida papel="admin"><PainelAdmin /></Protegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
