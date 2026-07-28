import { Link } from 'react-router-dom'

/**
 * Home. Logo, proposta de valor e a decisão de entrar ou criar conta —
 * nada de busca, categorias ou selos antes do login.
 *
 * O logo já traz o nome e o slogan ("Encontre profissionais de confiança"),
 * então o texto deles saiu daqui: repetir na página seria dizer a mesma
 * coisa duas vezes na mesma tela.
 *
 * `alt` descreve o conteúdo do logo para quem usa leitor de tela ou está
 * com a imagem bloqueada por conexão ruim.
 */
export default function Home() {
  return (
    <main className="wrap fade-in" style={{ paddingBottom: 60 }}>
      <section style={{
        minHeight: '70vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center'
      }}>
        <img
          src="/zelo-logo.jpeg"
          alt="Zelo — encontre profissionais de confiança"
          width={640}
          height={640}
          style={{
            width: '100%', maxWidth: 280, height: 'auto',
            marginBottom: 10
          }}
        />

        <p className="lead" style={{ maxWidth: 360, marginBottom: 36 }}>
          Faxineiras, babás e cuidadoras de idosos verificadas para cuidar
          da sua casa e da sua família.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          <Link
            to="/entrar"
            className="btn full"
            style={{ padding: 16, fontSize: 16, textAlign: 'center' }}
          >
            Entrar
          </Link>
          <Link
            to="/cadastrar"
            className="btn ghost full"
            style={{ padding: 16, fontSize: 16, textAlign: 'center' }}
          >
            Criar conta
          </Link>
        </div>
      </section>
    </main>
  )
}
