import { useState } from 'react'
import { Link } from 'react-router-dom'

/** Versão do texto abaixo — suba ao alterar qualquer palavra do termo.
 *  É o que liga a prova de consentimento ao texto que a pessoa leu. */
export const VERSAO_TERMO = '2026-07-30'

/**
 * Termo de Consentimento e Ciência do Usuário.
 *
 * Diferente da versão anterior (que era específica sobre a coleta de
 * selfie), este texto cobre TODO usuário — cliente e profissional:
 * consentimento LGPD para tratamento de dados, ciência de que o Zelo é
 * apenas intermediador, e responsabilidade de quem contrata pela própria
 * escolha.
 *
 * O consentimento ESPECÍFICO para selfie e antecedentes (dado sensível,
 * art. 11 da LGPD) não vive mais aqui — ele passou para o momento do
 * upload, que é onde a coleta de fato acontece. Ver o aviso no
 * componente de Verificação.
 *
 * Recolhido por padrão: texto jurídico aberto faz a pessoa rolar sem ler.
 * O aceite exige clique explícito no checkbox — nunca vem marcado.
 */
export default function TermoConsentimento({ aceito, onChange }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h3 style={{ marginBottom: 6 }}>Termo de Consentimento e Ciência do Usuário</h3>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}>
        Como tratamos seus dados e qual é o papel do Zelo.
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
          maxHeight: 300, overflowY: 'auto', fontSize: 13, lineHeight: 1.6,
          color: 'var(--ink)', background: 'var(--paper)', padding: '14px 15px',
          borderRadius: 10, border: '1px solid var(--line)', marginBottom: 14
        }}>
          <p style={{ marginBottom: 12 }}>
            Ao concluir meu cadastro no Zelo, declaro que li, compreendi e
            concordo com os termos abaixo:
          </p>

          <p style={{ marginBottom: 10 }}>
            <b>1.</b> Autorizo o tratamento dos meus dados pessoais pelo Zelo
            para criação e manutenção da minha conta, disponibilização dos
            serviços da plataforma, comunicação, suporte e cumprimento de
            obrigações legais, em conformidade com a Lei Geral de Proteção de
            Dados (Lei nº 13.709/2018 – LGPD).
          </p>

          <p style={{ marginBottom: 10 }}>
            <b>2.</b> Estou ciente de que o Zelo atua exclusivamente como
            plataforma de intermediação entre clientes e profissionais
            autônomos, não sendo empregador, prestador dos serviços
            contratados ou responsável pela execução, qualidade, pontualidade
            ou resultados dos serviços oferecidos.
          </p>

          <p style={{ marginBottom: 10 }}>
            <b>3.</b> Compreendo que as informações disponibilizadas pelos
            profissionais em seus perfis são de responsabilidade exclusiva de
            seus respectivos titulares.
          </p>

          <p style={{ marginBottom: 10 }}>
            <b>4.</b> Quando informado no perfil do profissional que houve
            conferência documental realizada pelo Zelo, estou ciente de que
            essa verificação se refere exclusivamente aos documentos
            apresentados no momento da análise, não representando garantia
            permanente sobre a conduta, idoneidade ou situação futura do
            profissional.
          </p>

          <p style={{ marginBottom: 10 }}>
            <b>5.</b> Estou ciente de que a contratação do profissional é
            realizada por minha livre escolha, sendo minha responsabilidade
            avaliar as informações disponíveis, as avaliações de outros
            usuários e demais elementos que considerar relevantes antes da
            contratação.
          </p>

          <p style={{ marginBottom: 10 }}>
            <b>6.</b> Declaro que as informações fornecidas por mim durante o
            cadastro são verdadeiras, completas e atualizadas,
            comprometendo-me a mantê-las corretas.
          </p>

          <p style={{ marginBottom: 12 }}>
            <b>7.</b> Estou ciente de que meus dados pessoais serão tratados
            conforme descrito na Política de Privacidade do Zelo e poderei
            exercer, a qualquer momento, os direitos previstos na LGPD.
          </p>

          <p>
            Ao selecionar a opção “Li e concordo”, manifesto meu consentimento
            livre, informado e inequívoco para o tratamento dos meus dados
            pessoais, nos termos deste documento e da Política de Privacidade
            do Zelo.
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
          Li e concordo com os{' '}
          <Link to="/termos" target="_blank" style={{ color: 'var(--sage-700)' }}>
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link to="/privacidade" target="_blank" style={{ color: 'var(--sage-700)' }}>
            Política de Privacidade
          </Link>
        </span>
      </label>
    </div>
  )
}
