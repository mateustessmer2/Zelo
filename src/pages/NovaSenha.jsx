import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

/**
 * Definir senha nova, depois de clicar no link do e-mail.
 *
 * O link traz um token que o Supabase troca por uma sessão temporária de
 * recuperação. Por isso esta tela não pede e-mail nem senha antiga: quem
 * chegou aqui já provou ter acesso à caixa de entrada.
 *
 * O evento PASSWORD_RECOVERY chega de forma assíncrona, um instante depois
 * do carregamento — daí esperarmos por ele em vez de checar a sessão uma
 * vez só e desistir (mesmo tipo de corrida que já nos custou caro no
 * login e no cadastro).
 */
export default function NovaSenha() {
  const { definirNovaSenha } = useAuth()
  const navigate = useNavigate()
  const [pronto, setPronto] = useState(false)
  const [semSessao, setSemSessao] = useState(false)
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    let ativo = true

    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (!ativo) return
      if (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN') setPronto(true)
    })

    // Se a sessão de recuperação já estiver ativa quando a tela abre
    // (acontece quando o Supabase processa o token antes do React montar).
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      if (data.session) setPronto(true)
      else setTimeout(() => ativo && !pronto && setSemSessao(true), 2500)
    })

    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function submeter(e) {
    e.preventDefault()
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    if (senha !== confirma) return setErro('As duas senhas não são iguais.')

    setSalvando(true)
    setErro(null)
    try {
      await definirNovaSenha(senha)
      setSucesso(true)
      setTimeout(() => navigate('/entrar'), 1500)
    } catch {
      setErro('Não foi possível alterar a senha. Peça um link novo e tente de novo.')
      setSalvando(false)
    }
  }

  if (semSessao && !pronto) {
    return (
      <main className="wrap fade-in" style={{ padding: '40px 0 60px', maxWidth: 440 }}>
        <h2>Link inválido ou expirado</h2>
        <p className="lead" style={{ marginBottom: 24 }}>
          Links de recuperação valem por 1 hora e só podem ser usados uma vez.
          Peça um novo para continuar.
        </p>
        <Link to="/recuperar-senha" className="btn full" style={{ textAlign: 'center' }}>
          Pedir link novo
        </Link>
      </main>
    )
  }

  if (!pronto) {
    return <main className="wrap"><div className="loading">Carregando…</div></main>
  }

  return (
    <main className="wrap fade-in" style={{ padding: '40px 0 60px', maxWidth: 440 }}>
      <h2>Criar senha nova</h2>
      <p className="lead" style={{ marginBottom: 24 }}>
        Escolha uma senha com pelo menos 6 caracteres.
      </p>

      <form onSubmit={submeter}>
        {erro && <div className="erro">{erro}</div>}
        {sucesso && (
          <div style={{
            background: '#E8F2EA', color: 'var(--green)', fontWeight: 600,
            padding: '12px 14px', borderRadius: 10, marginBottom: 14, fontSize: 14.5
          }}>
            ✓ Senha alterada com sucesso
          </div>
        )}

        <div className="field">
          <label htmlFor="senha">Senha nova</label>
          <input
            id="senha" type="password" value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required minLength={6} autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label htmlFor="confirma">Repita a senha</label>
          <input
            id="confirma" type="password" value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            required minLength={6} autoComplete="new-password"
          />
        </div>

        <button className="btn full" type="submit" disabled={salvando || sucesso}>
          {sucesso ? 'Pronto' : salvando ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>
    </main>
  )
}
