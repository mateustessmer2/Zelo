import { useEffect, useState } from 'react'
import {
  listarFilaVerificacao, urlAssinadaDocumento, decidirVerificacao, rotuloVerificacao,
  listarFilaReferencias, decidirReferencia
} from '../lib/api'
import { useAuth } from '../hooks/useAuth'

/**
 * Fila de verificação manual + fila de referências de trabalho.
 *
 * Aprovar identidade E selfie faz a coluna gerada `visivel` virar true
 * sozinha — ninguém "publica" um perfil manualmente. A regra mora no banco.
 * (Antecedentes está temporariamente fora dessa regra — ver migração 16.)
 *
 * Referências não afetam `visivel` — elas só mudam o `selo`
 * (bronze/prata/ouro), calculado por trigger conforme quantas forem
 * aprovadas. Antes de aprovar uma, ligue para o contato informado e
 * confirme que o trabalho aconteceu de fato.
 *
 * Documentos abrem por URL assinada de 60 segundos. Nunca getPublicUrl().
 */
export default function PainelAdmin() {
  const { perfil } = useAuth()
  const [fila, setFila] = useState(null)
  const [filaRef, setFilaRef] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => { carregar(); carregarReferencias() }, [])

  async function carregar() {
    try {
      setFila(await listarFilaVerificacao())
    } catch {
      setFila([])
    }
  }

  async function carregarReferencias() {
    try {
      setFilaRef(await listarFilaReferencias())
    } catch {
      setFilaRef([])
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

  async function decidirRef(r, status) {
    try {
      await decidirReferencia({ referenciaId: r.id, status, adminId: perfil.id })
      carregarReferencias()
    } catch {
      setErro('Não foi possível registrar a decisão.')
    }
  }

  if (!fila || !filaRef) return <main className="wrap"><div className="loading">Carregando…</div></main>

  return (
    <main className="wrap fade-in" style={{ padding: '30px 0 60px' }}>
      <h2>Fila de verificação</h2>
      <p className="lead" style={{ marginBottom: 22 }}>
        Confira identidade e selfie. Aprovar as duas coloca o perfil no ar automaticamente.
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
                {rotuloVerificacao(v.tipo)}
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

      <h2 style={{ marginTop: 36 }}>Referências de trabalho</h2>
      <p className="lead" style={{ marginBottom: 22 }}>
        Ligue para o contato informado antes de aprovar. Cada referência confirmada
        conta para o selo da profissional (1 = bronze, 2 = prata, 3 = ouro).
      </p>

      {filaRef.length === 0 && <div className="empty">Nenhuma referência pendente.</div>}

      {filaRef.map((r) => (
        <div key={r.id} className="card">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--sage-900)' }}>
              {r.profissional_nome}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              referência: <b>{r.nome_referencia}</b> · {r.telefone}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              enviado em {new Date(r.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            <button className="btn sm" style={{ background: 'var(--green)' }} onClick={() => decidirRef(r, 'aprovado')}>
              Confirmei — aprovar
            </button>
            <button className="btn ghost sm" onClick={() => decidirRef(r, 'rejeitado')}>
              Não confirmada
            </button>
          </div>
        </div>
      ))}
    </main>
  )
}
