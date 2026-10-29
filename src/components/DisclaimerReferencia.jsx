import { useState } from 'react'

/** Versão do texto — suba ao alterar qualquer palavra do disclaimer. */
export const VERSAO_DISCLAIMER_REFERENCIA = '2026-10-29.2'

/**
 * Aviso exibido antes de contratar uma profissional que tem referências
 * de trabalho confirmadas.
 *
 * É uma "fricção positiva": um passo a mais de propósito, curto e claro,
 * que explica o que o cliente vai receber (nomes e telefones PARCIAIS),
 * por que vem mascarado (privacidade de quem indicou) e o que pode e não
 * pode fazer com isso. Aceitar aqui autoriza o envio do e-mail-resumo.
 *
 * O trecho da LGPD continua — é a barreira legal contra uso indevido de
 * dado de terceiro —, só que mais curto e depois do essencial.
 */
export default function DisclaimerReferencia({ aberto, onAceitar, onCancelar, enviando, quantidade }) {
  const [marcado, setMarcado] = useState(false)

  if (!aberto) return null

  const qtd = quantidade > 1 ? `${quantidade} referências confirmadas` : 'referência confirmada'

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="titulo-disclaimer-ref"
      className="modal-fundo" onClick={onCancelar}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icone" aria-hidden="true">
          <Cadeado tamanho={22} />
        </div>

        <h3 id="titulo-disclaimer-ref" style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 500, marginBottom: 8 }}>
          Referências protegidas
        </h3>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--muted)', marginBottom: 18 }}>
          Esta profissional tem {qtd} pela equipe do Zelo. Ao contratar, você
          recebe um resumo por e-mail.
        </p>

        <ul className="lista-icones">
          <li>
            <Cadeado tamanho={17} />
            <span>
              <b>Dados parciais, para proteger quem indicou:</b> você vê o
              primeiro nome e o final do telefone — por exemplo, <i>Ana L.</i> e{' '}
              <i>(53) •••••••-34</i>.
            </span>
          </li>
          <li>
            <Conversa />
            <span>
              Para saber mais sobre uma referência, fale <b>direto com a
              profissional</b>, que fez as indicações.
            </span>
          </li>
          <li>
            <Registro />
            <span>O envio fica registrado pelo Zelo, com data e contratação.</span>
          </li>
        </ul>

        <p style={{
          fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)', marginBottom: 18,
          background: 'var(--cream)', borderRadius: 10, padding: '10px 12px'
        }}>
          Os dados de quem indicou são usados só para conferir esta contratação.
          Divulgá-los ou usá-los para outro fim pode violar a LGPD (Lei nº
          13.709/2018) e gerar responsabilidade civil e criminal.
        </p>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 18 }}>
          <input
            type="checkbox" checked={marcado} onChange={(e) => setMarcado(e.target.checked)}
            style={{ width: 19, height: 19, marginTop: 1, flexShrink: 0, accentColor: 'var(--sage-900)' }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45, color: 'var(--sage-900)' }}>
            Entendi e vou usar essas informações só para conferir a contratação.
          </span>
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={onCancelar} disabled={enviando} style={{ flex: 1 }}>
            Voltar
          </button>
          <button
            className="btn"
            onClick={() => onAceitar(VERSAO_DISCLAIMER_REFERENCIA)}
            disabled={!marcado || enviando}
            style={{ flex: 1.4 }}
          >
            {enviando ? 'Contratando…' : 'Concordo e contratar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Cadeado({ tamanho = 18 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="var(--sage-900)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}
function Conversa() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--sage-900)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  )
}
function Registro() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--sage-900)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l2 2 4-4" /><path d="M5 4h14v16H5z" />
    </svg>
  )
}
