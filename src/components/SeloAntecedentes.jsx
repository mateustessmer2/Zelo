import { useState } from 'react'

/**
 * Selo de AUTODECLARAÇÃO de antecedentes.
 *
 * Visual neutro (cinza, sem o ✓ verde) de propósito: o Zelo NÃO verifica
 * antecedentes hoje (migração 16). Um selo verde seria lido como
 * "verificado" — promessa que a plataforma não pode cumprir. Ao tocar,
 * abre o texto exato do que a profissional declarou.
 *
 * Só aparece para quem aceitou a Declaração de Antecedentes no cadastro
 * (`profissionais.declaracao_antecedentes`).
 */
export default function SeloAntecedentes({ pequeno = false }) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAberto(true) }}
        className="seal neutro"
        style={{ border: 'none', cursor: 'pointer', font: 'inherit', fontSize: pequeno ? 11 : undefined }}
        aria-label="O que significa esta declaração"
      >
        Declarou não ter antecedentes
      </button>

      {aberto && (
        <div
          role="dialog" aria-modal="true" aria-labelledby="titulo-selo-antec"
          className="modal-fundo" onClick={() => setAberto(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="titulo-selo-antec" style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 500, marginBottom: 10 }}>
              Autodeclaração de antecedentes
            </h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 12 }}>
              No cadastro, esta profissional declarou, sob sua responsabilidade,
              não ter antecedentes criminais incompatíveis com os serviços que
              oferece.
            </p>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--muted)', marginBottom: 18 }}>
              <b>Esta é uma declaração da própria profissional.</b> O Zelo não
              verifica antecedentes criminais no momento. O que o Zelo confere é
              a identidade (documento e selfie).
            </p>
            <button className="btn full" onClick={() => setAberto(false)}>Entendi</button>
          </div>
        </div>
      )}
    </>
  )
}
