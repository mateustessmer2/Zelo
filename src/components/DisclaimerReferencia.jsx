import { useState } from 'react'

/** Versão do texto — suba ao alterar qualquer palavra do disclaimer. */
export const VERSAO_DISCLAIMER_REFERENCIA = '2026-07-31'

/**
 * Disclaimer exibido antes de enviar o contato de referência por e-mail.
 *
 * Só aparece quando a profissional TEM referência aprovada (a contagem
 * vem de `contarReferenciasAprovadas`, que nunca revela o conteúdo em si
 * — só o número). Aceitar aqui é o que autoriza o envio do e-mail com
 * primeiro nome + telefone.
 *
 * O texto precisa deixar claro que o contato é para conferência da
 * contratação, não para uso livre — é a barreira legal pedida
 * explicitamente contra divulgação ou uso indevido de dado de terceiro.
 */
export default function DisclaimerReferencia({ aberto, onAceitar, onCancelar, enviando }) {
  const [marcado, setMarcado] = useState(false)

  if (!aberto) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-disclaimer-ref"
      onClick={onCancelar}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,26,22,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 60
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper)', borderRadius: 16, padding: '24px 22px',
          maxWidth: 440, width: '100%', maxHeight: '85vh', overflowY: 'auto'
        }}
      >
        <h3 id="titulo-disclaimer-ref" style={{ marginTop: 0, marginBottom: 12 }}>
          Antes de continuar
        </h3>

        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
          Esta profissional tem referência de trabalho confirmada pelo Zelo.
          Ao contratar, você receberá por e-mail o primeiro nome e o telefone
          de contato dessa referência, para que possa ligar e confirmar a
          experiência antes de decidir.
        </p>

        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--muted)', marginBottom: 14 }}>
          Esse contato é de uma pessoa física, fornecido para esta finalidade
          específica. <b>A divulgação desse contato a terceiros, ou seu uso
          para qualquer finalidade diferente da conferência da contratação,
          pode configurar violação da Lei Geral de Proteção de Dados (Lei nº
          13.709/2018) e sujeitar quem o fizer às responsabilidades civil e
          criminal cabíveis.</b>
        </p>

        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 18 }}>
          O envio deste contato é registrado pelo Zelo, incluindo a data e a
          contratação relacionada.
        </p>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 18 }}>
          <input
            type="checkbox"
            checked={marcado}
            onChange={(e) => setMarcado(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.45 }}>
            Li e entendo que devo usar este contato apenas para conferir a
            contratação, sob minha responsabilidade.
          </span>
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={onCancelar} disabled={enviando} style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            className="btn"
            onClick={() => onAceitar(VERSAO_DISCLAIMER_REFERENCIA)}
            disabled={!marcado || enviando}
            style={{ flex: 1 }}
          >
            {enviando ? 'Enviando…' : 'Concordo e continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}
