import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { exportarMeusDados, encerrarMinhaConta } from '../lib/api'

/**
 * Minha conta e privacidade — onde a pessoa exerce na prática os direitos
 * da LGPD, sem precisar mandar e-mail e esperar resposta.
 *
 * A exclusão pede confirmação por digitação, não só um clique. É
 * irreversível e leva junto contratações, avaliações e referências —
 * um toque acidental não pode bastar.
 */
export default function MinhaConta() {
  const { perfil, sair } = useAuth()
  const navigate = useNavigate()

  const [baixando, setBaixando] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState(null)

  const destinoPainel =
    perfil?.role === 'profissional' ? '/painel-profissional'
    : perfil?.role === 'admin' ? '/admin'
    : '/painel'

  async function baixarDados() {
    if (!perfil?.id) return
    setBaixando(true)
    setErro(null)
    try {
      const dados = await exportarMeusDados(perfil.id)
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zelo-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErro('Não foi possível gerar o arquivo agora. Tente novamente.')
    } finally {
      setBaixando(false)
    }
  }

  async function excluirConta() {
    if (confirmacao !== 'EXCLUIR') return
    setExcluindo(true)
    setErro(null)
    try {
      await encerrarMinhaConta(perfil.id)
      navigate('/')
    } catch {
      setErro('Não foi possível encerrar a conta. Escreva para privacidade@zeloemcasa.com.br.')
      setExcluindo(false)
    }
  }

  return (
    <main className="wrap fade-in" style={{ padding: '30px 0 60px', maxWidth: 560 }}>
      <h2>Minha conta e privacidade</h2>
      <p className="lead" style={{ marginBottom: 24 }}>
        Aqui você acessa, corrige e exclui seus dados — direitos garantidos pela LGPD.
      </p>

      {erro && <div className="erro">{erro}</div>}

      <div className="card">
        <h3>Corrigir meus dados</h3>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 14 }}>
          Nome, telefone, endereço de atendimento e demais informações do
          cadastro podem ser alterados a qualquer momento no seu painel.
        </p>
        <Link to={destinoPainel} className="btn ghost sm">Ir para o painel</Link>
      </div>

      <div className="card">
        <h3>Baixar meus dados</h3>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 14 }}>
          Gera um arquivo com tudo que temos sobre você: cadastro, contratações,
          avaliações que você escreveu e referências. Formato JSON, legível por
          outros sistemas.
        </p>
        <button className="btn ghost sm" onClick={baixarDados} disabled={baixando}>
          {baixando ? 'Gerando…' : 'Baixar meus dados'}
        </button>
      </div>

      <div className="card">
        <h3>Revogar consentimentos</h3>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 0 }}>
          Você pode revogar a qualquer momento o consentimento dado no cadastro.
          Como a plataforma depende desse consentimento para manter sua conta,
          revogar equivale a encerrar a conta — o que você pode fazer abaixo.
          Para revogar apenas o uso da selfie mantendo a conta, escreva para{' '}
          <a href="mailto:privacidade@zeloemcasa.com.br">privacidade@zeloemcasa.com.br</a>.
        </p>
      </div>

      <div className="card" style={{ borderColor: '#e6c9c9' }}>
        <h3 style={{ color: '#a33' }}>Encerrar minha conta</h3>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 10 }}>
          Isso apaga seu perfil, suas contratações, avaliações e referências.
          <b> A ação não pode ser desfeita.</b>
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
          Seu login continua registrado no sistema de autenticação até que a
          equipe do Zelo faça a remoção definitiva — sem perfil, porém, ele não
          dá acesso a nada. Para apagar também esse registro, peça por e-mail.
        </p>

        <div className="field">
          <label htmlFor="confirma-excluir">
            Digite <b>EXCLUIR</b> para confirmar
          </label>
          <input
            id="confirma-excluir"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder="EXCLUIR"
            autoComplete="off"
          />
        </div>

        <button
          className="btn full"
          style={{ background: '#a33' }}
          onClick={excluirConta}
          disabled={confirmacao !== 'EXCLUIR' || excluindo}
        >
          {excluindo ? 'Encerrando…' : 'Encerrar conta definitivamente'}
        </button>
      </div>

      <div className="card">
        <h3>Sair da conta</h3>
        <button className="btn ghost sm" onClick={async () => { await sair(); navigate('/') }}>
          Sair
        </button>
      </div>
    </main>
  )
}
