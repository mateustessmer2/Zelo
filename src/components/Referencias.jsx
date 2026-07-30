import { useState } from 'react'
import { enviarReferencia } from '../lib/api'
import SeloReferencias from './SeloReferencias'

const ROTULO_STATUS = {
  pendente: { texto: 'Aguardando confirmação', cor: 'var(--muted)' },
  em_analise: { texto: 'Em análise', cor: 'var(--muted)' },
  aprovado: { texto: '✓ Confirmada', cor: 'var(--green)' },
  rejeitado: { texto: 'Não confirmada', cor: '#b8862c' }
}

/**
 * Referências de trabalho anteriores — até 3, cada uma vira um contato
 * (nome + telefone) que o admin liga para confirmar antes de aprovar.
 *
 * A profissional só vê o STATUS de cada uma (pendente/confirmada/não
 * confirmada) — nunca edita depois de enviar, e o limite de 3 é reforçado
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
      <h3>Referências de trabalho</h3>
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
        <div style={{ marginBottom: 16 }}>
          {referencias.map((r) => (
            <div key={r.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--line)'
            }}>
              <span style={{ fontSize: 14 }}>{r.nome_referencia}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: ROTULO_STATUS[r.status]?.cor }}>
                {ROTULO_STATUS[r.status]?.texto ?? r.status}
              </span>
            </div>
          ))}
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
