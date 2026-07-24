import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header() {
  const { sessao, perfil, sair } = useAuth()
  const navigate = useNavigate()

  // Só resolve o destino quando o papel já é conhecido. Enquanto `perfil`
  // não chega, o botão não aparece — melhor do que aparecer e levar ao
  // painel errado.
  const painel =
    perfil?.role === 'profissional' ? '/painel-profissional'
    : perfil?.role === 'admin' ? '/admin'
    : perfil?.role === 'cliente' ? '/painel'
    : null

  async function handleSair() {
    await sair()
    navigate('/')
  }

  return (
    <header className="wrap header">
      <Link to="/" className="logo"><span className="dot" />Zelo</Link>
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
    </header>
  )
}
