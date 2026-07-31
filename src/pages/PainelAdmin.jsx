import { useEffect, useState } from 'react'
import {
  listarFilaVerificacao, urlAssinadaDocumento, decidirVerificacao, rotuloVerificacao,
  listarFilaReferencias, decidirReferencia, listarReferenciasAprovadas, bloquearReferencia
} from '../lib/api'
import { useAuth } from '../hooks/useAuth'

/**
 * Fila de verificação manual + fila de referências de trabalho + gestão
 * de referências já aprovadas (bloqueio).
 *
 * Aprovar identidade E selfie faz a coluna gerada `visivel` virar true
 * sozinha — ninguém "publica" um perfil manualmente. A regra mora no banco.
 * (Antecedentes está temporariamente fora dessa regra — ver migração 16.)
 *
 * Referências não afetam `visivel` — elas só mudam o `selo`
 * (bronze/prata/ouro), calculado por trigger conforme quantas forem
 * aprovadas e não bloqueadas. Antes de aprovar uma, ligue para o contato
 * informado e confirme que o trabalho aconteceu de fato.
 *
 * O contato (nome/telefone) de uma referência aprovada NUNCA aparece no
 * perfil público — ele só é entregue por e-mail ao cliente que contrata,
 * depois de aceitar um disclaimer legal (migração 27, Edge Function
 * `enviar-referencia`). Bloquear aqui interrompe esse envio e some com o
 * ponto no selo, sem apagar o registro de que a referência já existiu.
 *
 * Documentos abrem por URL assinada de 60 segundos. Nunca getPublicUrl().
 */
export default function PainelAdmin() {
  const { perfil } = useAuth()
  const [fila, setFila] = useState(null)
  const [filaRef, setFilaRef] = useState(null)
  const [aprovadas, setAprovadas] = useState(null)
  const [erro, setErro] = useState(null)
  const [bloqueandoId, setBloqueandoId] = useState(null)
  const [motivo, setMotivo] = useState('')

  useEffect(() => { carregar(); carregarReferencias(); carregarAprovadas() }, [])

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

  async function carregarAprovadas() {
    try {
      setAprovadas(await listarReferenciasAprovadas())
    } catch {
      setAprovadas([])
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
      carregarAprovadas()
    } catch {
      setErro('Não foi possível registrar a decisão.')
    }
  }

  async function confirmarBloqueio(referenciaId) {
    try {
      await bloquearReferencia({ referenciaId, bloqueada: true, motivo: motivo.trim() || null })
      setBloqueandoId(null)
      setMotivo('')
      carregarAprovadas()
    } catch {
      setErro('Não foi possível bloquear a referência.')
    }
  }

  async function desbloquear(referenciaId) {
    try {
      await bloquearReferencia({ referenciaId, bloqueada: false, motivo: null })
      carregarAprovadas()
    } catch {
      setErro('Não foi possível desbloquear a referência.')
    }
  }

  if (!fila || !filaRef || !aprovadas) {
    return <main className="wrap"><div className="loading">Carregando…</div></main>
  }

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

      <h2 style={{ marginTop: 36 }}>Referências pendentes</h2>
      <p className="lead" style={{ marginBottom: 22 }}>
        Ligue para o contato informado antes de aprovar. Cada referência confirmada
        conta para o selo da profissional (1 = bronze, 2 = prata, 3 = ouro). O
        contato só chega ao cliente por e-mail, no momento da contratação — nunca
        aparece no perfil público.
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

      <h2 style={{ marginTop: 36 }}>Referências aprovadas</h2>
      <p className="lead" style={{ marginBottom: 22 }}>
        Se a pessoa citada como referência reclamar do uso do contato, bloqueie
        aqui — ela para de ser divulgada e de contar para o selo, sem apagar o
        histórico de que foi aprovada uma vez.
      </p>

      {aprovadas.length === 0 && <div className="empty">Nenhuma referência aprovada ainda.</div>}

      {aprovadas.map((r) => (
        <div key={r.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--sage-900)' }}>
                {r.profissional_nome}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                referência: <b>{r.nome_referencia}</b> · {r.telefone}
              </div>
            </div>
            <span className={`status ${r.bloqueada ? 's-pend' : 's-done'}`}>
              {r.bloqueada ? 'Bloqueada' : 'Ativa'}
            </span>
          </div>

          {r.bloqueada && r.bloqueada_motivo && (
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
              Motivo: {r.bloqueada_motivo}
            </p>
          )}

          {r.bloqueada ? (
            <button className="btn ghost sm" onClick={() => desbloquear(r.id)}>
              Desbloquear
            </button>
          ) : bloqueandoId === r.id ? (
            <div>
              <div className="field" style={{ marginBottom: 10 }}>
                <label htmlFor={`motivo-${r.id}`}>Motivo do bloqueio (opcional)</label>
                <input
                  id={`motivo-${r.id}`} value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex.: a pessoa citada pediu para não ser mais indicada"
                />
              </div>
              <div style={{ display: 'flex', gap: 9 }}>
                <button className="btn sm" style={{ background: '#a33' }} onClick={() => confirmarBloqueio(r.id)}>
                  Confirmar bloqueio
                </button>
                <button className="btn ghost sm" onClick={() => { setBloqueandoId(null); setMotivo('') }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button className="btn ghost sm" onClick={() => setBloqueandoId(r.id)}>
              Bloquear referência
            </button>
          )}
        </div>
      ))}
    </main>
  )
}
