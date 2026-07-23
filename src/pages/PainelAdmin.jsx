import { useEffect, useState } from 'react'
import { listarFilaVerificacao, urlAssinadaDocumento, decidirVerificacao } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

/**
 * Fila de verificação manual.
 *
 * Aprovar identidade E antecedentes faz a coluna gerada `visivel` virar true
 * sozinha — ninguém "publica" um perfil manualmente. A regra mora no banco.
 *
 * Documentos abrem por URL assinada de 60 segundos. Nunca getPublicUrl().
 */
export default function PainelAdmin() {
  const { perfil } = useAuth()
  const [fila, setFila] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      setFila(await listarFilaVerificacao())
    } catch {
      setFila([])
    }
  }

  async function abrir(path) {
    try {
      const url = await urlAssinadaDocumento(path, 60)
      window.open(url, '_blank', 'noopener')
    } catch {
      setErro('Não foi possível abrir o documento.')
    }
  }

  async function decidir(v, status) {
    try {
      await decidirVerificacao({
        verificacaoId: v.id,
        profissionalId: v.profissionais?.id,
        tipo: v.tipo,
        status,
        adminId: perfil.id
      })
      carregar()
    } catch {
      setErro('Não foi possível registrar a decisão.')
    }
  }

  if (!fila) return <main className="wrap"><div className="loading">Carregando…</div></main>

  return (
    <main className="wrap fade-in" style={{ padding: '30px 0 60px' }}>
      <h2>Fila de verificação</h2>
      <p className="lead" style={{ marginBottom: 22 }}>
        Confira identidade e antecedentes. Aprovar os dois coloca o perfil no ar automaticamente.
      </p>

      {erro && <div className="erro">{erro}</div>}

      {fila.length === 0 && <div className="empty">Nenhuma verificação pendente.</div>}

      {fila.map((v) => (
        <div key={v.id} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div className="avatar sm">{v.profissionais?.perfis?.nome?.[0] ?? '?'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--sage-900)' }}>
                {v.profissionais?.perfis?.nome}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {v.tipo === 'identidade' ? 'Documento de identidade' : 'Certidão de antecedentes'}
                {' · enviado em '}{new Date(v.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <span className={`status ${v.status === 'em_analise' ? 's-pend' : 's-done'}`}>
              {v.status === 'em_analise' ? 'Em análise' : 'Pendente'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {v.documento_path && (
              <button className="btn ghost sm" onClick={() => abrir(v.documento_path)}>
                Abrir documento
              </button>
            )}
            <button className="btn sm" style={{ background: 'var(--green)' }} onClick={() => decidir(v, 'aprovado')}>
              Aprovar
            </button>
            <button className="btn ghost sm" onClick={() => decidir(v, 'rejeitado')}>
              Solicitar correção
            </button>
          </div>
        </div>
      ))}
    </main>
  )
}
