import { useEffect, useRef, useState } from 'react'
import { listarMensagens, enviarMensagem, inscreverMensagens, obterContato } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

/**
 * Chat interno de uma contratação.
 *
 * O contato (telefone/WhatsApp) só aparece quando o booking está confirmado —
 * e quem garante isso é a policy `contatos_select_booking_confirmado`, não
 * este componente. Se o banco não devolver a linha, não há contato para
 * mostrar, ponto.
 *
 * Sobre disintermediação: liberar o telefone atrasa a fuga para o WhatsApp,
 * mas não a impede. O que segura as pessoas aqui é o valor contínuo —
 * histórico, reputação, reagendamento. Não trate o cadeado como estratégia.
 */
export default function Chat({ booking, outraParteId, outraParteNome }) {
  const { perfil } = useAuth()
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [contato, setContato] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const fimRef = useRef(null)

  const liberado = ['confirmado', 'concluido'].includes(booking.status)

  useEffect(() => {
    let ativo = true
    listarMensagens(booking.id)
      .then((m) => ativo && setMensagens(m))
      .catch(() => ativo && setMensagens([]))

    const cancelar = inscreverMensagens(booking.id, (nova) => {
      setMensagens((atuais) =>
        atuais.some((m) => m.id === nova.id) ? atuais : [...atuais, nova]
      )
    })

    return () => { ativo = false; cancelar() }
  }, [booking.id])

  useEffect(() => {
    if (!liberado) return setContato(null)
    obterContato(outraParteId).then(setContato).catch(() => setContato(null))
  }, [liberado, outraParteId])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  async function mandar(e) {
    e.preventDefault()
    const conteudo = texto.trim()
    if (!conteudo) return
    setEnviando(true)
    setTexto('')
    try {
      const nova = await enviarMensagem({ bookingId: booking.id, autorId: perfil.id, conteudo })
      setMensagens((atuais) =>
        atuais.some((m) => m.id === nova.id) ? atuais : [...atuais, nova]
      )
    } catch {
      setTexto(conteudo) // devolve o texto para não perder o que a pessoa escreveu
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card">
      <h3>Conversa com {outraParteNome}</h3>

      <div style={{
        background: 'var(--cream)', borderRadius: 14, padding: 16,
        maxHeight: 280, overflowY: 'auto', marginBottom: 12
      }}>
        {mensagens.length === 0 && (
          <div className="empty" style={{ padding: '20px 0' }}>
            Nenhuma mensagem ainda. Combine os detalhes por aqui.
          </div>
        )}
        {mensagens.map((m) => {
          const minha = m.autor_id === perfil?.id
          return (
            <div
              key={m.id}
              style={{
                maxWidth: '78%', padding: '10px 14px', borderRadius: 15,
                fontSize: 13.5, marginBottom: 9, lineHeight: 1.45,
                background: minha ? 'var(--sage-900)' : 'var(--paper)',
                color: minha ? '#fff' : 'var(--ink)',
                border: minha ? 'none' : '1px solid var(--line)',
                marginLeft: minha ? 'auto' : 0,
                borderBottomRightRadius: minha ? 5 : 15,
                borderBottomLeftRadius: minha ? 15 : 5
              }}
            >
              {m.conteudo}
            </div>
          )
        })}
        <div ref={fimRef} />
      </div>

      <form onSubmit={mandar} style={{ display: 'flex', gap: 8 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem…"
          aria-label="Mensagem"
          style={{
            flex: 1, padding: '12px 15px', border: '1.5px solid var(--line)',
            borderRadius: 12, fontFamily: 'inherit', fontSize: 14.5,
            background: 'var(--cream)'
          }}
        />
        <button className="btn" type="submit" disabled={enviando || !texto.trim()}>
          Enviar
        </button>
      </form>

      {liberado ? (
        contato?.telefone ? (
          <div style={{
            textAlign: 'center', padding: 13, fontSize: 13.5, fontWeight: 600,
            color: 'var(--green)', background: 'var(--green-bg)', borderRadius: 11, marginTop: 10
          }}>
            📞 Contato liberado: {contato.telefone}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: 12, fontSize: 12.5, color: 'var(--muted)',
            background: 'var(--sage-100)', borderRadius: 11, marginTop: 10
          }}>
            {outraParteNome} ainda não cadastrou um telefone.
          </div>
        )
      ) : (
        <div style={{
          textAlign: 'center', padding: 12, fontSize: 12.5, color: 'var(--muted)',
          background: 'var(--sage-100)', borderRadius: 11, marginTop: 10
        }}>
          🔒 Telefone e WhatsApp são liberados após a confirmação da contratação
        </div>
      )}
    </div>
  )
}
