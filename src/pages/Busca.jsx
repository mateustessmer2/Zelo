import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { listarCidadesAtivas, listarBairros, buscarProfissionais } from '../lib/api'

/**
 * Fluxo do cliente: bairro → data → turno → observação → resultados.
 *
 * Mostra poucas opções compatíveis, não uma lista infinita. A busca não
 * precisa filtrar por verificação: a policy `prof_select_visiveis` já
 * esconde quem não passou pela identidade + antecedentes.
 */
export default function Busca() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const categoriaId = params.get('categoria')
  const categoriaNome = params.get('nome') || 'Profissionais'

  const [bairros, setBairros] = useState([])
  const [bairroId, setBairroId] = useState('')
  const [data, setData] = useState('')
  const [turno, setTurno] = useState('')
  const [obs, setObs] = useState('')

  const [resultados, setResultados] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    listarCidadesAtivas()
      .then(async (cidades) => {
        if (!cidades.length) return
        const bs = await listarBairros(cidades[0].id)
        setBairros(bs)
      })
      .catch(() => setBairros([]))
  }, [])

  async function buscar() {
    setBuscando(true)
    setErro(null)
    try {
      const rs = await buscarProfissionais({ categoriaId, bairroId: bairroId || null })
      setResultados(rs)
    } catch {
      setErro('Não foi possível buscar agora. Tente novamente.')
    } finally {
      setBuscando(false)
    }
  }

  if (resultados) {
    return (
      <main className="wrap fade-in" style={{ padding: '30px 0 60px' }}>
        <button className="btn ghost sm" onClick={() => setResultados(null)} style={{ marginBottom: 20 }}>
          ← Ajustar busca
        </button>
        <h2>As melhores opções pra você</h2>
        <p className="lead" style={{ marginBottom: 22 }}>
          Poucas escolhas selecionadas — não uma lista infinita.
        </p>

        {resultados.length === 0 ? (
          <div className="empty">
            Ainda não temos profissionais verificadas para essa combinação.
            <br />Tente outro bairro ou outra data.
          </div>
        ) : (
          resultados.map((p) => (
            <div key={p.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="avatar">{p.perfis?.nome?.[0] ?? '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--sage-900)' }}>{p.perfis?.nome}</span>
                  <span className="seal hi">✓ Verificada</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
                  {p.profissional_bairros?.map((b) => b.bairros?.nome).filter(Boolean).join(', ')}
                </div>
                {p.tempo_resposta_min && (
                  <div style={{ fontSize: 12.5, color: 'var(--sage-700)', marginTop: 8 }}>
                    responde em <b>{p.tempo_resposta_min} min</b>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {p.valor_hora && (
                  <div>
                    <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 19, color: 'var(--sage-900)' }}>
                      R$ {p.valor_hora}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>/hora</span>
                  </div>
                )}
                <Link to={`/profissional/${p.id}`} className="btn dark sm" style={{ marginTop: 8 }}>Ver perfil</Link>
              </div>
            </div>
          ))
        )}
      </main>
    )
  }

  return (
    <main className="wrap fade-in" style={{ padding: '30px 0 60px' }}>
      <button className="btn ghost sm" onClick={() => navigate('/')} style={{ marginBottom: 20 }}>← Voltar</button>
      <h2>{categoriaNome}</h2>
      <p className="lead" style={{ marginBottom: 24 }}>
        Quatro perguntas rápidas pra achar quem combina com você.
      </p>

      {erro && <div className="erro">{erro}</div>}

      <div className="field">
        <label htmlFor="bairro">Em qual bairro?</label>
        <select id="bairro" value={bairroId} onChange={(e) => setBairroId(e.target.value)}>
          <option value="">Selecione o bairro</option>
          {bairros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="data">Quando?</label>
        <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div className="field">
        <label>Qual horário?</label>
        <div className="chips">
          {['Manhã', 'Tarde', 'Noite'].map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${turno === t ? 'on' : ''}`}
              onClick={() => setTurno(turno === t ? '' : t)}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="obs">Alguma observação? <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional)</span></label>
        <textarea
          id="obs" rows="2" value={obs} onChange={(e) => setObs(e.target.value)}
          placeholder="Ex.: casa com dois cachorros, prefiro produtos sem cheiro forte…"
        />
      </div>

      <button className="btn full" onClick={buscar} disabled={buscando}>
        {buscando ? 'Buscando…' : 'Ver profissionais compatíveis'}
      </button>
    </main>
  )
}
