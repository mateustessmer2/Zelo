const CORES = {
  bronze: { bg: '#F1E4D3', texto: '#8A5A2B', icone: '🥉' },
  prata:  { bg: '#E8EAEC', texto: '#5A6570', icone: '🥈' },
  ouro:   { bg: '#FBEFC2', texto: '#8A6D1D', icone: '🥇' }
}

/**
 * Selo de referências de trabalho: bronze (1), prata (2) ou ouro (3).
 * `selo` vem direto da coluna `profissionais.selo`, calculada no banco —
 * este componente só decide a aparência, nunca a regra de quando aparece.
 */
export default function SeloReferencias({ selo, tamanho = 'normal' }) {
  if (!selo || !CORES[selo]) return null
  const { bg, texto, icone } = CORES[selo]
  const pequeno = tamanho === 'pequeno'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: bg, color: texto, fontWeight: 700,
      fontSize: pequeno ? 11.5 : 13, padding: pequeno ? '3px 8px' : '4px 10px',
      borderRadius: 999, whiteSpace: 'nowrap'
    }}>
      <span aria-hidden="true">{icone}</span>
      {selo === 'bronze' ? 'Bronze' : selo === 'prata' ? 'Prata' : 'Ouro'}
    </span>
  )
}
