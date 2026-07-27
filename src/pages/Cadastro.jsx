import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { listarCidadesAtivas, listarBairros } from '../lib/api'

/**
 * Cadastro em duas telas.
 *
 * TELA 1 — só a escolha do papel, como dois cartões grandes, nada mais na
 * página. Antes, papel era um chip discreto competindo visualmente com
 * nome/e-mail/senha; a escolha mais importante do cadastro (o que define o
 * que a pessoa vê depois — inclusive qual lado das avaliações ela consegue
 * ler) tinha o mesmo peso visual que preencher o e-mail.
 *
 * Vindo de um link com `?tipo=`, a tela 1 é pulada — o botão do Header já
 * decidiu por quem clicou nele.
 *
 * TELA 2 — formulário normal, já sabendo o papel.
 */
export default function Cadastro() {
  const [params] = useSearchParams()
  const { cadastrar } = useAuth()
  const navigate = useNavigate()

  const tipoDaUrl = params.get('tipo') === 'profissional' ? 'profissional'
    : params.get('tipo') === 'cliente' ? 'cliente'
    : null

  const [role, setRole] = useState(tipoDaUrl)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [cidades, setCidades] = useState([])
  const [cidadeId, setCidadeId] = useState('')
  const [bairros, setBairros] = useState([])
  const [bairroId, setBairroId] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarCidadesAtivas().then((cs) => {
      setCidades(cs)
      if (cs.length) setCidadeId(cs[0].id)
    }).catch(() => setCidades([]))
  }, [])

  useEffect(() => {
    if (!cidadeId) return
    listarBairros(cidadeId).then(setBairros).catch(() => setBairros([]))
  }, [cidadeId])

  async function submeter(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await cadastrar({ email, senha, nome, role, cidadeId, bairroId: bairroId || null })
      navigate(role === 'profissional' ? '/painel-profissional' : '/painel')
    } catch (err) {
      setErro(err?.message ?? 'Não foi possível criar a conta.')
    } finally {
      setEnviando(false)
    }
  }

  // ------------------------------------------------------------------ Tela 1
  if (!role) {
    return (
      <main className="wrap fade-in" style={{ padding: '50px 0 60px', maxWidth: 520 }}>
        <h2 style={{ textAlign: 'center' }}>O que você precisa?</h2>
        <p className="lead" style={{ textAlign: 'center', marginBottom: 30 }}>
          Isso define o que você vai ver e fazer no Zelo.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            type="button"
            onClick={() => setRole('cliente')}
            className="card"
            style={{
              textAlign: 'left', cursor: 'pointer', border: '2px solid var(--line)',
              padding: '22px 20px', background: 'var(--paper)'
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--sage-900)', marginBottom: 4 }}>
              Preciso contratar
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              Encontrar faxineira, babá ou cuidadora verificada perto de você.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRole('profissional')}
            className="card"
            style={{
              textAlign: 'left', cursor: 'pointer', border: '2px solid var(--line)',
              padding: '22px 20px', background: 'var(--paper)'
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--sage-900)', marginBottom: 4 }}>
              Quero oferecer serviços
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              Aparecer para famílias que procuram o que você faz, com verificação e avaliações reais.
            </div>
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 26, fontSize: 14, color: 'var(--muted)' }}>
          Já tem conta? <Link to="/entrar" style={{ color: 'var(--sage-700)', fontWeight: 600 }}>Entrar</Link>
        </p>
      </main>
    )
  }

  // ------------------------------------------------------------------ Tela 2
  return (
    <main className="wrap fade-in" style={{ padding: '40px 0 60px', maxWidth: 460 }}>
      <button
        type="button"
        onClick={() => setRole(null)}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13.5, marginBottom: 14, cursor: 'pointer', padding: 0 }}
      >
        ← Trocar
      </button>

      <h2>{role === 'profissional' ? 'Cadastro de profissional' : 'Cadastro de cliente'}</h2>
      <p className="lead" style={{ marginBottom: 24 }}>Leva menos de dois minutos.</p>

      <form onSubmit={submeter}>
        {erro && <div className="erro">{erro}</div>}

        <div className="field">
          <label htmlFor="nome">Nome completo</label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>

        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} autoComplete="new-password" />
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="cidade">Cidade</label>
            <select id="cidade" value={cidadeId} onChange={(e) => setCidadeId(e.target.value)}>
              {cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="bairro">Bairro</label>
            <select id="bairro" value={bairroId} onChange={(e) => setBairroId(e.target.value)}>
              <option value="">Selecione</option>
              {bairros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome === 'Outro / não listado' ? 'Outros bairros' : b.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {role === 'profissional' && (
          <div className="note warn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#b8862c" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <p>
              <b>Próximo passo: verificação.</b> Depois do cadastro você envia documento de
              identidade, certidão de antecedentes e uma selfie. Seu perfil entra na busca automaticamente
              assim que os três forem aprovados. Seus documentos ficam privados — clientes veem
              apenas o selo de verificada.
            </p>
          </div>
        )}

        <button className="btn full" type="submit" disabled={enviando} style={{ marginTop: 18 }}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
        Já tem conta? <Link to="/entrar" style={{ color: 'var(--sage-700)', fontWeight: 600 }}>Entrar</Link>
      </p>
    </main>
  )
}
