import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { listarCidadesAtivas, listarBairros } from '../lib/api'

/**
 * Cadastro. O papel escolhido aqui define o que a pessoa enxerga depois —
 * inclusive qual lado das avaliações ela consegue ler (ver RLS).
 *
 * A profissional entra com verificação pendente e NÃO aparece na busca até
 * identidade e antecedentes serem aprovados. Isso é dito na tela, não
 * escondido: a barreira é o produto, não um obstáculo.
 */
export default function Cadastro() {
  const [params] = useSearchParams()
  const { cadastrar } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState(params.get('tipo') === 'profissional' ? 'profissional' : 'cliente')
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

  return (
    <main className="wrap fade-in" style={{ padding: '40px 0 60px', maxWidth: 460 }}>
      <h2>Criar conta</h2>
      <p className="lead" style={{ marginBottom: 24 }}>Leva menos de dois minutos.</p>

      <div className="chips" style={{ marginBottom: 22 }}>
        <button type="button" className={`chip ${role === 'cliente' ? 'on' : ''}`} onClick={() => setRole('cliente')}>
          Preciso contratar
        </button>
        <button type="button" className={`chip ${role === 'profissional' ? 'on' : ''}`} onClick={() => setRole('profissional')}>
          Quero oferecer serviços
        </button>
      </div>

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
              {bairros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
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
              identidade e certidão de antecedentes. Seu perfil entra na busca automaticamente
              assim que os dois forem aprovados. Seus documentos ficam privados — clientes veem
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
