import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Rodapé com links permanentes — exigência de transparência: documentos
 * legais e canal de contato precisam estar acessíveis de qualquer tela,
 * não só no cadastro.
 *
 * "Minha conta e privacidade" só aparece para quem está logado, porque a
 * área de exclusão/exportação exige sessão.
 */
export default function Rodape() {
  const { sessao } = useAuth()

  const link = {
    color: 'var(--muted)', fontSize: 13, textDecoration: 'none'
  }

  return (
    <footer style={{
      borderTop: '1px solid var(--line)', marginTop: 40,
      padding: '24px 0 32px'
    }}>
      <div className="wrap" style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px 20px',
        justifyContent: 'center', textAlign: 'center'
      }}>
        <Link to="/termos" style={link}>Termos de Uso</Link>
        <Link to="/privacidade" style={link}>Política de Privacidade</Link>
        {sessao && <Link to="/minha-conta" style={link}>Minha conta e privacidade</Link>}
        <a href="mailto:contato@zeloemcasa.com.br" style={link}>Contato</a>
      </div>
      <p style={{
        textAlign: 'center', fontSize: 12, color: 'var(--muted)',
        marginTop: 14, marginBottom: 0
      }}>
        Zelo · Pelotas, RS
      </p>
    </footer>
  )
}
