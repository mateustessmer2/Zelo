/**
 * Foto da pessoa quando existe; inicial do nome quando não.
 * `tamanho`: undefined (padrão), 'lg' ou 'sm' — as classes de global.css.
 */
export default function Avatar({ nome, foto, tamanho }) {
  return (
    <div className={`avatar${tamanho ? ` ${tamanho}` : ''}`}>
      {foto
        ? <img src={foto} alt="" loading="lazy" />
        : (nome?.trim()?.[0]?.toUpperCase() ?? '?')}
    </div>
  )
}
