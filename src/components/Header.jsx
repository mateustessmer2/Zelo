import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { sessao, perfil, sair } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Só resolve o destino quando o papel já é conhecido. Enquanto `perfil`
  // não chega, o botão não aparece — melhor do que aparecer e levar ao
  // painel errado.
  const painel =
    perfil?.role === 'profissional' ? '/painel-profissional'
    : perfil?.role === 'admin' ? '/admin'
    : perfil?.role === 'cliente' ? '/painel'
    : null

  // Na home, sem login, a página já mostra "Entrar" e "Criar conta" como
  // os dois botões principais e únicos da tela. Repeti-los aqui em cima
  // era ruído — duas rotas visuais para a mesma decisão. Em qualquer
  // outra página sem login, os links continuam aparecendo normalmente.
  const naHomeDeslogado = location.pathname === '/' && !sessao

  async function handleSair() {
    await sair()
    navigate('/')
  }

  return (
    <header className="wrap header">
      <Link to="/" className="logo"><span className="dot" />Zelo</Link>
      {!naHomeDeslogado && (
        <nav style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {sessao ? (
            <>
              {painel && <Link to={painel} className="btn ghost sm">Meu painel</Link>}
              <button className="btn ghost sm" onClick={handleSair}>Sair</button>
            </>
          ) : (
            <>
              <Link to="/cadastrar?tipo=profissional" className="btn ghost sm">Sou profissional</Link>
              <Link to="/entrar" className="btn sm">Entrar</Link>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
