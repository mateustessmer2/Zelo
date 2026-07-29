import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Pedido de recuperação de senha.
 *
 * A confirmação é sempre a mesma, tenha o e-mail conta ou não. Dizer
 * "esse e-mail não existe" entregaria a quem perguntasse a lista de quem
 * tem cadastro no Zelo — informação que não deve sair daqui, ainda mais
 * num app onde as profissionais são identificáveis.
 */
export default function RecuperarSenha() {
  const { recuperarSenha } = useAuth()
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function submeter(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await recuperarSenha(email)
      setEnviado(true)
    } catch {
      setErro('Não foi possível enviar agora. Tente novamente em instantes.')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <main className="wrap fade-in" style={{ padding: '40px 0 60px', maxWidth: 440 }}>
        <h2>Verifique seu e-mail</h2>
        <p className="lead" style={{ marginBottom: 24 }}>
          Se houver uma conta com <b>{email}</b>, enviamos um link para criar
          uma senha nova. O link vale por 1 hora.
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 24 }}>
          Não chegou? Confira a caixa de spam. Se ainda assim não aparecer,
          fale com a gente pelo WhatsApp.
        </p>
        <Link to="/entrar" className="btn full" style={{ textAlign: 'center' }}>
          Voltar para o login
        </Link>
      </main>
    )
  }

  return (
    <main className="wrap fade-in" style={{ padding: '40px 0 60px', maxWidth: 440 }}>
      <h2>Recuperar senha</h2>
      <p className="lead" style={{ marginBottom: 24 }}>
        Informe o e-mail da sua conta e enviamos um link para criar uma senha nova.
      </p>

      <form onSubmit={submeter}>
        {erro && <div className="erro">{erro}</div>}
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            required autoComplete="email"
          />
        </div>
        <button className="btn full" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar link'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
        Lembrou a senha? <Link to="/entrar" style={{ color: 'var(--sage-700)', fontWeight: 600 }}>Entrar</Link>
      </p>
    </main>
  )
}
