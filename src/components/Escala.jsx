import { useMemo, useState } from 'react'

/**
 * Escala do profissional: os próximos 14 dias numa faixa de calendário e,
 * embaixo, os compromissos do dia escolhido em cartões.
 *
 * Pensada para leitura rápida, como uma escala de plantão: cada dia mostra
 * pontinhos (verde = confirmado, âmbar = pedido aguardando resposta), e o
 * cartão diz turno, cliente, bairro e status — nada além disso. Aceitar,
 * recusar e conversar continuam na aba Pedidos, para onde o cartão leva.
 */
const DIAS = 14
const TURNO = {
  manha: { rotulo: 'Manhã', ordem: 1 },
  tarde: { rotulo: 'Tarde', ordem: 2 },
  integral: { rotulo: 'Integral', ordem: 0 },
  noite: { rotulo: 'Noite', ordem: 3 }
}

function chave(d) {
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export default function Escala({ bookings, onAbrirPedidos }) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)

  const dias = useMemo(() => Array.from({ length: DIAS }, (_, i) => {
    const d = new Date(hoje); d.setDate(hoje.getDate() + i); return d
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chave(hoje)])

  const porDia = useMemo(() => {
    const m = {}
    for (const b of bookings ?? []) {
      if (!['confirmado', 'solicitado'].includes(b.status)) continue
      ;(m[b.data_servico] ??= []).push(b)
    }
    for (const k in m) m[k].sort((a, b) => (TURNO[a.turno]?.ordem ?? 9) - (TURNO[b.turno]?.ordem ?? 9))
    return m
  }, [bookings])

  const primeiroComAlgo = dias.find((d) => porDia[chave(d)]?.length)
  const [selecionado, setSelecionado] = useState(chave(primeiroComAlgo ?? hoje))

  const naQuinzena = dias.flatMap((d) => porDia[chave(d)] ?? [])
  const confirmados = naQuinzena.filter((b) => b.status === 'confirmado').length
  const aguardando = naQuinzena.filter((b) => b.status === 'solicitado').length
  const doDia = porDia[selecionado] ?? []
  const dataSel = new Date(`${selecionado}T00:00`)

  if (bookings === null) return <div className="loading">Carregando…</div>

  return (
    <>
      <h2>Sua escala</h2>
      <p className="lead" style={{ marginBottom: 18 }}>Os próximos {DIAS} dias, de relance.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Resumo numero={confirmados} rotulo={confirmados === 1 ? 'confirmado' : 'confirmados'} classe="s-verde" />
        <Resumo numero={aguardando} rotulo="a responder" classe="s-ambar" />
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 18, scrollbarWidth: 'none' }}>
        {dias.map((d) => {
          const k = chave(d)
          const itens = porDia[k] ?? []
          const ativo = k === selecionado
          const ehHoje = k === chave(hoje)
          return (
            <button
              key={k} type="button" onClick={() => setSelecionado(k)}
              style={{
                flex: '0 0 52px', padding: '9px 0 8px', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'center',
                background: ativo ? 'var(--selecionado)' : 'var(--paper)',
                color: ativo ? '#fff' : 'var(--ink)',
                border: `1.5px solid ${ativo ? 'var(--selecionado)' : ehHoje ? 'var(--sage-500)' : 'var(--line)'}`
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', opacity: ativo ? .8 : .65 }}>
                {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, margin: '2px 0 5px' }}>{d.getDate()}</div>
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center', height: 6 }}>
                {itens.slice(0, 3).map((b) => (
                  <span key={b.id} style={{
                    width: 6, height: 6, borderRadius: 99,
                    background: b.status === 'confirmado' ? 'var(--green)' : 'var(--amber)',
                    outline: ativo ? '1.5px solid rgba(255,255,255,.6)' : 'none'
                  }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <h3 style={{ fontSize: 15, marginBottom: 10 }}>
        {(() => {
          const t = dataSel.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
          return (selecionado === chave(hoje) ? 'Hoje · ' : '') + t.charAt(0).toUpperCase() + t.slice(1)
        })()}
      </h3>

      {doDia.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          Dia livre.
        </div>
      ) : doDia.map((b) => (
        <button
          key={b.id} type="button" onClick={onAbrirPedidos} className="card"
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '16px 18px',
            cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)',
            borderLeft: `4px solid ${b.status === 'confirmado' ? 'var(--green)' : 'var(--amber)'}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)' }}>{TURNO[b.turno]?.rotulo ?? b.turno}</span>
            <span className={`status ${b.status === 'confirmado' ? 's-verde' : 's-ambar'}`}>
              {b.status === 'confirmado' ? 'Confirmado' : 'Responder'}
            </span>
          </div>
          <div style={{ fontSize: 14.5, marginTop: 6 }}>
            {b.perfis?.nome ?? 'Cliente'}{b.bairros?.nome ? <span style={{ color: 'var(--muted)' }}> · {b.bairros.nome}</span> : null}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{b.categorias?.nome}</div>
        </button>
      ))}
    </>
  )
}

function Resumo({ numero, rotulo, classe }) {
  return (
    <div className="card" style={{ flex: 1, marginBottom: 0, padding: '14px 16px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: "'Fraunces',serif", fontSize: 28, fontWeight: 500, color: 'var(--sage-900)', lineHeight: 1 }}>{numero}</span>
      <span className={`status ${classe}`}>{rotulo}</span>
    </div>
  )
}
