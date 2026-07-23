/**
 * Índice de confiança — SOMENTE indicadores agregados.
 *
 * É o único caminho pelo qual alguém enxerga a reputação que recebeu do outro
 * lado. Comentários individuais nunca passam por aqui: quem recebeu vê média,
 * nunca texto. Ver policy `avaliacoes_select_segmentado` em 02_rls.sql.
 */
export default function TrustScore({ notaMedia, total, metricas = [] }) {
  const colunas = Math.min(metricas.length + 2, 4)
  return (
    <div className="card">
      <h3>Índice de confiança</h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colunas}, 1fr)`, gap: 10 }}>
        <Cell n={notaMedia ? `★ ${Number(notaMedia).toFixed(1)}` : '—'} l="avaliação média" />
        <Cell n={total ?? 0} l="serviços realizados" />
        {metricas.map((m) => <Cell key={m.label} n={m.valor} l={m.label} />)}
      </div>
    </div>
  )
}

function Cell({ n, l }) {
  return (
    <div style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--cream)', borderRadius: 14 }}>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 600, color: 'var(--sage-900)', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.35 }}>{l}</div>
    </div>
  )
}
