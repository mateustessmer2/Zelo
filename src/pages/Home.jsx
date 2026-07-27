import { Link } from 'react-router-dom'

/**
 * Home. Logo, slogan e proposta de valor, seguidos da decisão de entrar
 * ou criar conta — nada de busca, categorias ou selos antes do login.
 *
 * Isso inverte a razão de a busca ter sido liberada para visitantes sem
 * conta (migração 09/D): se ninguém chega à busca sem antes logar, esse
 * grant deixou de ter uso — ver nota no 13_home_login.sql sobre por que
 * ele foi deixado como está, e não revertido.
 */
export default function Home() {
  return (
    <main className="wrap fade-in" style={{ paddingBottom: 60 }}>
      <section style={{
        minHeight: '70vh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center'
      }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 34, color: 'var(--sage-900)', marginBottom: 18 }}>
          <span className="dot" style={{ marginRight: 10 }} />Zelo
        </div>

        <h1 style={{
          fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 26,
          color: 'var(--sage-900)', margin: '0 0 14px', maxWidth: 380, lineHeight: 1.25
        }}>
          Encontre profissionais de confiança.
        </h1>

        <p className="lead" style={{ maxWidth: 380, marginBottom: 40 }}>
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
