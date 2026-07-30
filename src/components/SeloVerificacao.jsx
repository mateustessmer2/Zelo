import { useState } from 'react'

/**
 * Selo de identidade confirmada — clicável, abre um modal explicando o que
 * a conferência significa e, principalmente, o que ela NÃO significa.
 *
 * Um selo sozinho é lido como garantia. Deixar explícito que ele se refere
 * a uma data específica, e não à conduta futura da pessoa, é o que separa
 * "informação útil" de "promessa que a plataforma não pode cumprir".
 */
export default function SeloVerificacao({ data }) {
  const [aberto, setAberto] = useState(false)

  const dataFormatada = data
    ? new Date(data).toLocaleDateString('pt-BR')
    : null

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="seal hi"
        style={{ border: 'none', cursor: 'pointer', font: 'inherit' }}
        aria-label="O que significa este selo"
      >
        ✓ Identidade confirmada
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-selo"
          onClick={() => setAberto(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(20,26,22,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 50
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)', borderRadius: 16, padding: '24px 22px',
              maxWidth: 420, width: '100%', maxHeight: '80vh', overflowY: 'auto'
            }}
          >
            <h3 id="titulo-selo" style={{ marginTop: 0, marginBottom: 12 }}>
              Sobre este selo
            </h3>

            {dataFormatada && (
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}>
                Documentação conferida pelo Zelo em <b>{dataFormatada}</b>.
              </p>
            )}

            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              A verificação confirma apenas que, na data da análise, os
              documentos apresentados correspondiam às informações do cadastro.
              Ela <b>não representa garantia permanente</b> de conduta,
              idoneidade ou comportamento futuro do profissional.
            </p>

            <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 20 }}>
              A decisão de contratar é sua, e vale considerar também as
              avaliações de outros usuários e as referências informadas.
            </p>

            <button className="btn full" onClick={() => setAberto(false)}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  )
}
