import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Login.
 *
 * POR QUE A NAVEGAÇÃO REAGE A `perfil`, EM VEZ DE SER DECIDIDA NO submeter()
 *
 * O carregamento de `perfil` acontece dentro do AuthProvider (useAuth.jsx),
 * num useEffect separado que só dispara depois que `sessao` muda — e isso
 * é assíncrono por natureza (é uma consulta ao banco). Tentar decidir o
 * destino logo após `entrar()` retornar é correr contra esse carregamento:
 * não importa quantas vezes se tentou "esperar o SDK terminar" (getSession,
 * getUser) de dentro desta tela — a fonte da verdade sobre QUANDO o papel
 * está pronto é o próprio `perfil` do contexto, não um sinal do SDK.
 *
 * Por isso: `submeter` só chama `entrar()` e marca que o login foi feito;
 * um efeito observa `perfil` e navega assim que ele chega — sem importar
 * quantos ciclos de render isso levar.
 */
export default function Login() {
  const { entrar, perfil, sessao } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [logado, setLogado] = useState(false)

  // Dispara assim que `perfil` chegar — só depois de um login desta tela
  // (não em qualquer visita à página com sessão já aberta).
  useEffect(() => {
    if (!logado || !sessao) return
    if (!perfil) return // ainda carregando; o efeito roda de novo quando chegar

    navigate(
      perfil.role === 'profissional' ? '/painel-profissional'
      : perfil.role === 'admin' ? '/admin'
      : perfil.role === 'cliente' ? '/painel'
      : '/'
    )
  }, [logado, sessao, perfil, navigate])

  async function submeter(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await entrar(email, senha)
      setLogado(true) // acorda o efeito acima; ele espera o perfil sozinho
    } catch {
      setErro('E-mail ou senha incorretos.')
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
