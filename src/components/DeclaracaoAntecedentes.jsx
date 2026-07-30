import { useState } from 'react'

/** Versão do texto abaixo — suba ao alterar qualquer palavra da declaração. */
export const VERSAO_DECLARACAO = '2026-07-29'

/**
 * Declaração de Antecedentes Criminais — autodeclaração da profissional,
 * SEM verificação pela plataforma (a exigência de documento está
 * desativada — ver migração 16). Mesmo padrão do TermoConsentimento:
 * recolhido por padrão, aceite só por clique explícito.
 */
export default function DeclaracaoAntecedentes({ aceito, onChange }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h3 style={{ marginBottom: 6 }}>Declaração de Antecedentes Criminais</h3>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}>
        Uma autodeclaração sua — o Zelo não verifica antecedentes no momento.
      </p>

      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--sage-700)', fontSize: 13.5, fontWeight: 600,
          fontFamily: 'inherit', marginBottom: aberto ? 12 : 14
        }}
      >
        {aberto ? '− Ocultar declaração completa' : '+ Ler a declaração completa'}
      </button>

      {aberto && (
        <div style={{
          maxHeight: 280, overflowY: 'auto', fontSize: 13, lineHeight: 1.6,
          color: 'var(--ink)', background: 'var(--paper)', padding: '14px 15px',
          borderRadius: 10, border: '1px solid var(--line)', marginBottom: 14
        }}>
          <p style={{ marginBottom: 12 }}>
            Declaro, sob minha inteira responsabilidade, que não possuo
            antecedentes criminais incompatíveis com o exercício das
            atividades profissionais oferecidas por meio desta plataforma.
          </p>
          <p style={{ marginBottom: 12 }}>
            Estou ciente de que esta é uma autodeclaração, prestada de forma
            espontânea, e que as informações fornecidas são de minha
            exclusiva responsabilidade.
          </p>
          <p style={{ marginBottom: 12 }}>
            Reconheço que a plataforma não realiza, neste momento,
            verificação, validação ou certificação das informações
            declaradas, não garantindo aos usuários a inexistência de
            antecedentes criminais ou qualquer condição relacionada à
            minha idoneidade.
          </p>
          <p>
            Comprometo-me a manter esta informação verdadeira e atualizada,
            responsabilizando-me civil e criminalmente por qualquer
            declaração falsa, inexata ou omissão relevante, nos termos da
            legislação aplicável.
          </p>
        </div>
      )}

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={aceito}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>
          Declaro que li, compreendi e confirmo que as informações acima
          são verdadeiras e de minha exclusiva responsabilidade.
        </span>
      </label>
    </div>
  )
}
