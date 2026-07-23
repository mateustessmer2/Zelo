import { useEffect, useState } from 'react'
import {
  listarDisponibilidade, definirDisponibilidade,
  listarBloqueios, adicionarBloqueio, removerBloqueio
} from '../lib/api'
import { useAuth } from '../hooks/useAuth'

const DIAS = [
  { n: 1, label: 'Seg' }, { n: 2, label: 'Ter' }, { n: 3, label: 'Qua' },
  { n: 4, label: 'Qui' }, { n: 5, label: 'Sex' }, { n: 6, label: 'Sáb' },
  { n: 0, label: 'Dom' }
]
const TURNOS = [
  { id: 'manha', label: 'Manhã' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noite', label: 'Noite' }
]

/**
 * Agenda da profissional.
 *
 * Isto é uma DECLARAÇÃO de disponibilidade, não um compromisso cobrável.
 * Não existe penalidade por marcar-se indisponível, nem métrica de taxa de
 * aceitação — pressionar aceitação constrói subordinação, que é exatamente
 * o que caracteriza vínculo empregatício. Se algum dia alguém pedir "ranking
 * por disponibilidade", esse é o motivo para dizer não.
 */
export default function Agenda() {
  const { perfil } = useAuth()
  const [slots, setSlots] = useState([])          // [{dia, turno}]
  const [bloqueios, setBloqueios] = useState([])
  const [novaData, setNovaData] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [ok, setOk] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!perfil?.id) return
    listarDisponibilidade(perfil.id)
      .then((d) => setSlots(d.map((x) => ({ dia: x.dia_semana, turno: x.turno }))))
      .catch(() => setSlots([]))
    recarregarBloqueios()
  }, [perfil?.id])

  function recarregarBloqueios() {
    listarBloqueios(perfil.id).then(setBloqueios).catch(() => setBloqueios([]))
  }

  function temSlot(dia, turno) {
    return slots.some((s) => s.dia === dia && s.turno === turno)
  }

  function alternarSlot(dia, turno) {
    setOk(false)
    setSlots((atuais) =>
      temSlot(dia, turno)
        ? atuais.filter((s) => !(s.dia === dia && s.turno === turno))
        : [...atuais, { dia, turno }]
    )
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      await definirDisponibilidade(perfil.id, slots)
      setOk(true)
    } catch {
      setErro('Não foi possível salvar a disponibilidade.')
    } finally {
      setSalvando(false)
    }
  }

  async function adicionar() {
    if (!novaData) return
    try {
      await adicionarBloqueio(perfil.id, novaData, motivo || null)
      setNovaData('')
      setMotivo('')
      recarregarBloqueios()
    } catch {
      setErro('Não foi possível adicionar o bloqueio.')
    }
  }

  async function remover(id) {
    await removerBloqueio(id)
    recarregarBloqueios()
  }

  return (
    <>
      <h2>Sua agenda</h2>
      <p className="lead" style={{ marginBottom: 22 }}>
        Marque os dias e turnos em que você costuma atender. Você continua livre
        para aceitar ou recusar qualquer pedido.
      </p>

      {erro && <div className="erro">{erro}</div>}
      {ok && (
        <div style={{
          background: 'var(--green-bg)', color: 'var(--green)', padding: '13px 15px',
          borderRadius: 12, fontSize: 13.5, marginBottom: 14, fontWeight: 600
        }}>
          Disponibilidade salva.
        </div>
      )}

      <div className="card">
        <h3>Dias e turnos</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }} />
                {TURNOS.map((t) => (
                  <th key={t.id} style={{ padding: '8px 4px', fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIAS.map((d) => (
                <tr key={d.n}>
                  <td style={{ padding: '6px 4px', fontSize: 13.5, fontWeight: 600, color: 'var(--sage-900)' }}>
                    {d.label}
                  </td>
                  {TURNOS.map((t) => {
                    const on = temSlot(d.n, t.id)
                    return (
                      <td key={t.id} style={{ padding: '5px 4px', textAlign: 'center' }}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${d.label} ${t.label}`}
                          onClick={() => alternarSlot(d.n, t.id)}
                          style={{
                            width: '100%', padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: '.15s',
                            background: on ? 'var(--sage-900)' : 'var(--cream)',
                            color: on ? '#fff' : 'var(--sage-500)',
                            border: `1.5px solid ${on ? 'var(--sage-900)' : 'var(--line)'}`
                          }}
                        >
                          {on ? '✓' : '—'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn full" onClick={salvar} disabled={salvando} style={{ marginTop: 16 }}>
          {salvando ? 'Salvando…' : 'Salvar disponibilidade'}
        </button>
      </div>

      <div className="card">
        <h3>Férias e dias bloqueados</h3>

        {bloqueios.length === 0 && (
          <div className="empty" style={{ padding: '18px 0' }}>Nenhum bloqueio cadastrado.</div>
        )}

        {bloqueios.map((b) => (
          <div key={b.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '11px 0', borderBottom: '1px solid var(--line)', fontSize: 14
          }}>
            <span>
              {new Date(b.data + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
              {b.motivo && <span style={{ color: 'var(--muted)' }}> · {b.motivo}</span>}
            </span>
            <button className="btn ghost sm" onClick={() => remover(b.id)}>Remover</button>
          </div>
        ))}

        <div className="row" style={{ marginTop: 16 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="bloq-data">Data</label>
            <input id="bloq-data" type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="bloq-motivo">Motivo <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional)</span></label>
            <input id="bloq-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Férias, consulta…" />
          </div>
        </div>
        <button className="btn ghost full" onClick={adicionar} disabled={!novaData} style={{ marginTop: 14 }}>
          Adicionar bloqueio
        </button>
      </div>
    </>
  )
}
