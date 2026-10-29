import { useState } from 'react'
import { enviarReferencia } from '../lib/api'
import SeloReferencias from './SeloReferencias'

// Semáforo suave: cinza = esperando, verde = aprovada, âmbar = não deu
// para confirmar, vermelho = bloqueada pelo Zelo.
const ROTULO_STATUS = {
  pendente: { texto: 'Em análise', classe: 's-cinza' },
  em_analise: { texto: 'Em análise', classe: 's-cinza' },
  aprovado: { texto: 'Aprovada', classe: 's-verde' },
  rejeitado: { texto: 'Não confirmada', classe: 's-ambar' },
  bloqueada: { texto: 'Bloqueada', classe: 's-vermelho' }
}

const AJUDA_STATUS = {
  'Em análise': 'Vamos ligar para confirmar.',
  'Aprovada': 'Conta para o seu selo.',
  'Não confirmada': 'Não conseguimos confirmar este contato.',
  'Bloqueada': 'Retirada pelo Zelo. Não conta mais para o selo.'
}

function statusDe(r) {
  return r.bloqueada ? ROTULO_STATUS.bloqueada : (ROTULO_STATUS[r.status] ?? { texto: r.status, classe: 's-cinza' })
}

/**
 * Referências de trabalho anteriores — até 3, cada uma vira um contato
 * (nome + telefone) que o admin liga para confirmar antes de aprovar.
 *
 * A profissional só vê o STATUS de cada uma (em análise/aprovada/não
 * confirmada/bloqueada) — nunca edita depois de enviar, e o limite de 3 é reforçado
 * pelo banco (trigger `checar_limite_referencias`), não só por esta tela.
 */
export default function Referencias({ perfilId, referencias, selo, onEnviado }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  const restantes = 3 - referencias.length

  async function enviar(e) {
    e.preventDefault()
    if (!nome.trim() || !telefone.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      await enviarReferencia({ profissionalId: perfilId, nome: nome.trim(), telefone: telefone.trim() })
      setNome('')
      setTelefone('')
      onEnviado?.()
    } catch (err) {
      setErro(err?.message ?? 'Não foi possível enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card">
      <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 500, marginBottom: 6 }}>Referências de trabalho</h3>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 14 }}>
        Informe o contato de clientes que você já atendeu. Ligamos para confirmar
        que o contato existe antes de aprovar. Isso facilita o acesso à referência
        para quem for contratar — mas não substitui a conferência que o próprio
        cliente pode fazer.
      </p>

      {selo && (
        <div style={{ marginBottom: 14 }}>
          <SeloReferencias selo={selo} />
        </div>
      )}

      {referencias.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {referencias.map((r) => {
            const st = statusDe(r)
            return (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: '1px solid var(--line)'
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--sage-900)' }}>{r.nome_referencia}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
                    Enviada em {new Date(r.created_at).toLocaleDateString('pt-BR')} · {AJUDA_STATUS[st.texto] ?? ''}
                  </div>
                </div>
                <span className={`status ${st.classe}`} style={{ flexShrink: 0 }}>{st.texto}</span>
              </div>
            )
          })}
        </div>
      )}

      {restantes > 0 ? (
        <form onSubmit={enviar}>
          {erro && <div className="erro">{erro}</div>}
          <div className="field">
            <label htmlFor="ref-nome">Nome de quem você atendeu</label>
            <input id="ref-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="ref-tel">Telefone de contato</label>
            <input id="ref-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
          </div>
          <button className="btn full" type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar referência'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            Você pode enviar mais {restantes} {restantes === 1 ? 'referência' : 'referências'}.
          </p>
        </form>
      ) : (
        <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>
          Você já enviou o máximo de 3 referências.
        </p>
      )}
    </div>
  )
}
