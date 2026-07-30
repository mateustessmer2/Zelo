/**
 * Aviso de intermediação — texto fixo, definido pelo negócio.
 *
 * Usado tanto na tela do cliente (perfil da profissional, antes de
 * contratar) quanto na tela da profissional (cadastro) — é a mesma
 * declaração para os dois lados, por isso um componente único em vez de
 * duplicar o texto.
 */
export default function AvisoIntermediacao({ compacto = false }) {
  return (
    <div className="note neutral" style={{ fontSize: compacto ? 12.5 : 13.5 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5a6570" strokeWidth="2" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
      </svg>
      <p>
        A plataforma atua exclusivamente como intermediadora entre clientes e
        profissionais autônomos, não realizando investigação, certificação ou
        garantia acerca da idoneidade, antecedentes criminais, qualificações
        ou conduta dos profissionais cadastrados, salvo quando expressamente
        informado. As informações fornecidas pelos profissionais são de sua
        exclusiva responsabilidade.
      </p>
    </div>
  )
}
