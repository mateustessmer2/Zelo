import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { obterPapel } from '../lib/api'

export default function Login() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function submeter(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      // `entrar()` devolve o id direto do resultado do login — não
      // dependemos de reconsultar a sessão logo em seguida, que corria o
      // risco de rodar antes do SDK terminar de persistir a sessão nova.
      const userId = await entrar(email, senha)
      const role = userId ? await obterPapel(userId).catch(() => null) : null

      navigate(
        role === 'profissional' ? '/painel-profissional'
        : role === 'admin' ? '/admin'
        : role === 'cliente' ? '/painel'
        : '/'
      )
    } catch {
      setErro('E-mail ou senha incorretos.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="wrap fade-in" style={{ padding: '40px 0 60px', maxWidth: 440 }}>
      <h2>Entrar</h2>
      <p className="lead" style={{ marginBottom: 24 }}>Acesse sua conta para contratar ou atender.</p>

      <form onSubmit={submeter}>
        {erro && <div className="erro">{erro}</div>}
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
        </div>
        <button className="btn full" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
        Ainda não tem conta? <Link to="/cadastrar" style={{ color: 'var(--sage-700)', fontWeight: 600 }}>Cadastre-se</Link>
      </p>
    </main>
  )
}
