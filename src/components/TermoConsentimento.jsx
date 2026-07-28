import { useState } from 'react'

/** Versão do texto abaixo. Ao alterar qualquer palavra do termo, suba isto —
 *  é o que liga a prova de consentimento ao texto que a pessoa realmente leu. */
export const VERSAO_TERMO = '2026-07-27'

/**
 * Termo de Consentimento para Verificação de Identidade.
 *
 * Começa recolhido: a tela de cadastro já é longa, e um bloco de texto
 * jurídico aberto por padrão faz a pessoa rolar sem ler. O aceite exige
 * clique explícito no checkbox — nunca vem marcado.
 */
export default function TermoConsentimento({ aceito, onChange }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h3 style={{ marginBottom: 6 }}>Verificação de identidade</h3>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}>
        Para aparecer na busca, você envia uma selfie e a certidão de antecedentes.
        Os dois são usados só para conferência e apagados depois.
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
        {aberto ? '− Ocultar termo completo' : '+ Ler o termo completo'}
      </button>

      {aberto && (
        <div style={{
          maxHeight: 280, overflowY: 'auto', fontSize: 13, lineHeight: 1.6,
          color: 'var(--ink)', background: 'var(--paper)', padding: '14px 15px',
          borderRadius: 10, border: '1px solid var(--line)', marginBottom: 14
        }}>
          <p style={{ fontWeight: 700, marginBottom: 10 }}>
            Termo de Consentimento para Verificação de Identidade
          </p>
          <p style={{ marginBottom: 12 }}>
            Ao prosseguir com o cadastro, declaro que li e concordo com os termos abaixo.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 4 }}>1. Finalidade da coleta</p>
          <p style={{ marginBottom: 6 }}>
            Para aumentar a segurança e a confiança entre os usuários da plataforma,
            autorizo o envio dos seguintes documentos:
          </p>
          <ul style={{ margin: '0 0 10px 18px' }}>
            <li>Fotografia tipo selfie;</li>
            <li>Certidão de Antecedentes Criminais emitida pelos órgãos competentes.</li>
          </ul>
          <p style={{ marginBottom: 12 }}>
            Esses documentos serão utilizados exclusivamente para conferência da identidade
            do usuário e validação do cadastro, não sendo utilizados para qualquer outra
            finalidade.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 4 }}>2. Tratamento dos documentos</p>
          <p style={{ marginBottom: 6 }}>
            A plataforma realizará apenas a conferência dos documentos enviados, a fim de
            verificar a identidade do usuário e a autenticidade das informações fornecidas.
          </p>
          <p style={{ marginBottom: 6 }}>
            Após a conclusão da conferência e validação do cadastro, a selfie e a Certidão
            de Antecedentes Criminais serão permanentemente excluídas de nossos sistemas,
            não permanecendo armazenadas, arquivadas ou sob a posse da plataforma.
          </p>
          <p style={{ marginBottom: 12 }}>
            A plataforma manterá apenas a informação de que o cadastro foi validado, sem
            conservar cópias dos documentos utilizados na verificação.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 4 }}>3. Base legal</p>
          <p style={{ marginBottom: 12 }}>
            O tratamento dos documentos será realizado com base no consentimento do usuário,
            nos termos do artigo 7º, inciso I, da Lei nº 13.709/2018 (Lei Geral de Proteção
            de Dados – LGPD).
          </p>

          <p style={{ fontWeight: 600, marginBottom: 4 }}>4. Compartilhamento</p>
          <p style={{ marginBottom: 6 }}>
            Os documentos não serão compartilhados com outros usuários.
          </p>
          <p style={{ marginBottom: 12 }}>
            Caso seja necessária a utilização de serviços tecnológicos para a conferência
            da identidade ou armazenamento temporário durante o processo de validação, tais
            prestadores estarão sujeitos a obrigações de confidencialidade e proteção de
            dados, utilizando os documentos exclusivamente para essa finalidade.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 4 }}>5. Segurança</p>
          <p style={{ marginBottom: 12 }}>
            Durante o período estritamente necessário à conferência, a plataforma adotará
            medidas técnicas e administrativas adequadas para proteger os documentos contra
            acesso não autorizado, perda, alteração ou divulgação indevida.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 4 }}>6. Direitos do usuário</p>
          <p style={{ marginBottom: 12 }}>
            O usuário poderá, a qualquer momento, exercer os direitos previstos na LGPD,
            incluindo solicitar informações sobre o tratamento realizado, revogar o
            consentimento e esclarecer dúvidas sobre o processo de validação.
          </p>

          <p style={{ fontWeight: 600, marginBottom: 4 }}>7. Declaração de consentimento</p>
          <p style={{ marginBottom: 6 }}>Declaro que:</p>
          <ul style={{ margin: '0 0 10px 18px' }}>
            <li>os documentos enviados são verdadeiros e pertencem a mim;</li>
            <li>autorizo sua utilização exclusivamente para validação do meu cadastro;</li>
            <li>
              estou ciente de que a selfie e a Certidão de Antecedentes Criminais serão
              utilizadas apenas para conferência e serão definitivamente excluídas após a
              conclusão da análise, não permanecendo armazenadas pela plataforma;
            </li>
            <li>li e concordo com este Termo de Consentimento.</li>
          </ul>
          <p>
            Ao selecionar a opção “Li e concordo com este Termo de Consentimento”, manifesto
            meu consentimento livre, informado e inequívoco para o tratamento temporário dos
            documentos nas condições acima descritas.
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
          Li e concordo com este Termo de Consentimento
        </span>
      </label>
    </div>
  )
}
