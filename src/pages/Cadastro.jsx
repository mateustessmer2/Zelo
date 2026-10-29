import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { listarCidadesAtivas, listarBairros, listarCategoriasAtivas, listarTodosServicosDisponiveis } from '../lib/api'
import TermoConsentimento, { VERSAO_TERMO } from '../components/TermoConsentimento'
import DeclaracaoAntecedentes, { VERSAO_DECLARACAO } from '../components/DeclaracaoAntecedentes'

/**
 * Cadastro em etapas — é a tela inicial do app ("/") e também "/cadastrar".
 *
 * Uma pergunta por tela. A primeira é só "cliente ou profissional"; dela
 * depende o resto do caminho. E-mail e senha ficam para a ÚLTIMA tela:
 * a pessoa entra preenchendo o que importa (quem é, onde mora, o que faz)
 * e só no fim cria o acesso.
 *
 * As etapas são montadas dinamicamente:
 *  • Cidade só aparece se houver mais de uma cidade ativa;
 *  • cada categoria escolhida que tem subopções ganha a sua própria tela;
 *  • os campos de valor dependem das categorias (turno, km, sessão/pacote);
 *  • "Onde você atende" só para Personal Trainer, Massagista e Fisioterapeuta.
 *
 * Tudo (menos a senha) fica salvo no sessionStorage enquanto a pessoa
 * preenche: no iPhone, trocar de app e voltar pode recarregar a página, e
 * perder dez telas preenchidas faz a pessoa desistir.
 *
 * Os dados da profissional vão no metadata do signUp e quem grava é o
 * trigger do banco (migração 30) — funciona mesmo com confirmação de
 * e-mail ligada, quando ainda não existe sessão.
 */

const CHAVE_RASCUNHO = 'zelo_cadastro_rascunho'

const SLUGS_SESSAO = ['personal-trainer', 'massagista', 'fisioterapeuta']
const SLUG_MOTORISTA = 'motorista-particular'

function lerRascunho() {
  try { return JSON.parse(sessionStorage.getItem(CHAVE_RASCUNHO)) || null } catch { return null }
}

export default function Cadastro() {
  const [params] = useSearchParams()
  const { cadastrar, sessao, perfil, carregando } = useAuth()
  const navigate = useNavigate()

  const tipoDaUrl = params.get('tipo') === 'profissional' ? 'profissional'
    : params.get('tipo') === 'cliente' ? 'cliente'
    : null

  // Rascunho só vale se não contradiz o tipo escolhido no link do Header.
  const [inicial] = useState(() => {
    const r = lerRascunho()
    if (r && (!tipoDaUrl || r.role === tipoDaUrl)) return r
    return tipoDaUrl ? { role: tipoDaUrl, etapa: 'nome' } : {}
  })

  const [etapa, setEtapa] = useState(inicial.etapa ?? 'papel')
  const [role, setRole] = useState(inicial.role ?? null)
  const [nome, setNome] = useState(inicial.nome ?? '')
  const [cidadeId, setCidadeId] = useState(inicial.cidadeId ?? '')
  const [bairroId, setBairroId] = useState(inicial.bairroId ?? '')
  const [catSel, setCatSel] = useState(inicial.catSel ?? [])
  const [servSel, setServSel] = useState(inicial.servSel ?? [])
  const [valorMeioTurno, setValorMeioTurno] = useState(inicial.valorMeioTurno ?? '')
  const [valorDiaria, setValorDiaria] = useState(inicial.valorDiaria ?? '')
  const [valorKm, setValorKm] = useState(inicial.valorKm ?? '')
  const [valorSessaoAvulsa, setValorSessaoAvulsa] = useState(inicial.valorSessaoAvulsa ?? '')
  const [valorPacoteMensal, setValorPacoteMensal] = useState(inicial.valorPacoteMensal ?? '')
  const [atendeDomicilio, setAtendeDomicilio] = useState(inicial.atendeDomicilio ?? true)
  const [atendeLocalProprio, setAtendeLocalProprio] = useState(inicial.atendeLocalProprio ?? false)
  const [aceitouTermo, setAceitouTermo] = useState(inicial.aceitouTermo ?? false)
  const [aceitouDeclaracao, setAceitouDeclaracao] = useState(inicial.aceitouDeclaracao ?? false)
  const [declarouVerdade, setDeclarouVerdade] = useState(inicial.declarouVerdade ?? false)
  const [declarouApto, setDeclarouApto] = useState(inicial.declarouApto ?? false)
  const [email, setEmail] = useState(inicial.email ?? '')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [cidades, setCidades] = useState([])
  const [bairros, setBairros] = useState([])
  const [categorias, setCategorias] = useState([])
  const [servicos, setServicos] = useState([])

  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [precisaConfirmar, setPrecisaConfirmar] = useState(false)

  // ------------------------------------------------------------ Carregamentos
  useEffect(() => {
    listarCidadesAtivas().then((cs) => {
      setCidades(cs)
      if (cs.length && !cidadeId) setCidadeId(cs[0].id)
    }).catch(() => setCidades([]))
    listarCategoriasAtivas().then(setCategorias).catch(() => setCategorias([]))
    listarTodosServicosDisponiveis().then(setServicos).catch(() => setServicos([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!cidadeId) return
    listarBairros(cidadeId).then(setBairros).catch(() => setBairros([]))
  }, [cidadeId])

  // ---------------------------------------------------------------- Rascunho
  useEffect(() => {
    if (sucesso || precisaConfirmar) return
    try {
      sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({
        etapa, role, nome, cidadeId, bairroId, catSel, servSel,
        valorMeioTurno, valorDiaria, valorKm, valorSessaoAvulsa, valorPacoteMensal,
        atendeDomicilio, atendeLocalProprio,
        aceitouTermo, aceitouDeclaracao, declarouVerdade, declarouApto, email
      }))
    } catch { /* modo privado ou storage cheio: segue sem rascunho */ }
  }, [etapa, role, nome, cidadeId, bairroId, catSel, servSel, valorMeioTurno, valorDiaria,
      valorKm, valorSessaoAvulsa, valorPacoteMensal, atendeDomicilio, atendeLocalProprio,
      aceitouTermo, aceitouDeclaracao, declarouVerdade, declarouApto, email, sucesso, precisaConfirmar])

  function limparRascunho() {
    try { sessionStorage.removeItem(CHAVE_RASCUNHO) } catch { /* nada */ }
  }

  // ------------------------------------------------- Derivados das categorias
  const catsEscolhidas = categorias.filter((c) => catSel.includes(c.id))
  const temSessao = catsEscolhidas.some((c) => SLUGS_SESSAO.includes(c.slug))
  const temTurno = catsEscolhidas.some((c) => !SLUGS_SESSAO.includes(c.slug))
  const ehMotorista = catsEscolhidas.some((c) => c.slug === SLUG_MOTORISTA)

  const subopcoesPorCategoria = useMemo(() => {
    const m = {}
    for (const s of servicos) (m[s.categoria_id] ??= []).push(s)
    return m
  }, [servicos])

  // ---------------------------------------------------------- Lista de etapas
  const etapas = useMemo(() => {
    const l = ['papel', 'nome']
    if (cidades.length > 1) l.push('cidade')
    l.push('bairro')
    if (role === 'profissional') {
      l.push('categorias')
      for (const c of catsEscolhidas) {
        if (subopcoesPorCategoria[c.id]?.length) l.push(`sub:${c.id}`)
      }
      l.push('valores')
      if (temSessao) l.push('local')
    }
    l.push('termo')
    if (role === 'profissional') l.push('antecedentes', 'declaracoes')
    l.push('conta')
    return l
  }, [cidades.length, role, catsEscolhidas, subopcoesPorCategoria, temSessao])

  // Etapa que (ainda) não existe na lista — rascunho carregando, por
  // exemplo — cai na primeira tela até os dados chegarem.
  const indice = Math.max(0, etapas.indexOf(etapa))
  const etapaAtual = etapas[indice]

  // --------------------------------------------------------------- Validação
  function etapaValida(id) {
    if (id === 'papel') return !!role
    if (id === 'nome') return nome.trim().split(/\s+/).length >= 2
    if (id === 'cidade') return !!cidadeId
    if (id === 'bairro') return !!bairroId
    if (id === 'categorias') return catSel.length > 0
    if (id.startsWith('sub:')) {
      const catId = id.slice(4)
      return (subopcoesPorCategoria[catId] ?? []).some((s) => servSel.includes(s.id))
    }
    if (id === 'valores') {
      const visiveis = [
        temTurno && valorMeioTurno, temTurno && valorDiaria,
        ehMotorista && valorKm,
        temSessao && valorSessaoAvulsa, temSessao && valorPacoteMensal
      ]
      return visiveis.some((v) => v && Number(v) > 0)
    }
    if (id === 'local') return atendeDomicilio || atendeLocalProprio
    if (id === 'termo') return aceitouTermo
    if (id === 'antecedentes') return aceitouDeclaracao
    if (id === 'declaracoes') return declarouVerdade && declarouApto
    if (id === 'conta') return /\S+@\S+\.\S+/.test(email) && senha.length >= 6
    return true
  }

  function irPara(id) {
    setErro(null)
    setEtapa(id)
    window.scrollTo({ top: 0 })
  }

  function avancar(e) {
    e?.preventDefault()
    if (!etapaValida(etapaAtual)) return
    if (etapaAtual === 'conta') return criarConta()
    irPara(etapas[indice + 1])
  }

  function voltar() {
    if (indice > 0) irPara(etapas[indice - 1])
  }

  // --------------------------------------------------------------- Envio
  async function criarConta() {
    setEnviando(true)
    setErro(null)
    const servicosValidos = servSel.filter((id) =>
      servicos.some((s) => s.id === id && catSel.includes(s.categoria_id))
    )
    try {
      const { precisaConfirmarEmail } = await cadastrar({
        email: email.trim(), senha, nome: nome.trim(), role, cidadeId, bairroId: bairroId || null,
        termo: { aceito: aceitouTermo, versao: VERSAO_TERMO },
        declaracaoAntecedentes: role === 'profissional'
          ? { aceito: aceitouDeclaracao, versao: VERSAO_DECLARACAO }
          : null,
        declarouVerdade: role === 'profissional' ? declarouVerdade : false,
        declarouApto: role === 'profissional' ? declarouApto : false,
        dadosProfissional: role === 'profissional' ? {
          categorias: catSel,
          servicos: servicosValidos,
          valorMeioTurno: temTurno ? valorMeioTurno : null,
          valorDiaria: temTurno ? valorDiaria : null,
          valorKm: ehMotorista ? valorKm : null,
          valorSessaoAvulsa: temSessao ? valorSessaoAvulsa : null,
          valorPacoteMensal: temSessao ? valorPacoteMensal : null,
          atendeDomicilio: temSessao ? atendeDomicilio : true,
          atendeLocalProprio: temSessao ? atendeLocalProprio : false
        } : null
      })

      limparRascunho()

      if (precisaConfirmarEmail) {
        setPrecisaConfirmar(true)
        setEnviando(false)
        return
      }

      setSucesso(true)
      setTimeout(() => {
        navigate(role === 'profissional' ? '/painel-profissional' : '/painel')
      }, 1200)
    } catch (err) {
      if (err?.code === 'EMAIL_JA_CADASTRADO') {
        setErro('Este e-mail já tem conta. Use outro e-mail ou entre na sua conta.')
      } else {
        setErro(err?.message ?? 'Não foi possível criar a conta.')
      }
      setEnviando(false)
    }
  }

  // ----------------------------------------------------- Já logado: painel
  if (carregando) return <div className="loading">Carregando…</div>
  if (sessao && perfil && !enviando && !sucesso) {
    const destino = perfil.role === 'admin' ? '/admin'
      : perfil.role === 'profissional' ? '/painel-profissional' : '/painel'
    return <Navigate to={destino} replace />
  }

  // ------------------------------------------------- Confirmação de e-mail
  if (precisaConfirmar) {
    return (
      <main className="wrap fade-in" style={{ padding: '50px 0 60px', maxWidth: 440, textAlign: 'center' }}>
        <h2>Confirme seu e-mail</h2>
        <p className="lead" style={{ marginBottom: 24 }}>
          Enviamos um link de confirmação para <b>{email}</b>. Abra sua caixa
          de entrada e clique no link para ativar sua conta.
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 24 }}>
          Não chegou? Confira a pasta de spam. O link vale por algumas horas.
        </p>
        <Link to="/entrar" className="btn full" style={{ textAlign: 'center', display: 'block' }}>
          Já confirmei — entrar
        </Link>
      </main>
    )
  }

  // ---------------------------------------------------------- Etapa 1: papel
  if (etapaAtual === 'papel') {
    const escolher = (r) => {
      if (r !== role) { setCatSel([]); setServSel([]) }
      setRole(r)
      irPara('nome')
    }
    return (
      <main className="wrap fade-in" style={{ padding: '30px 0 60px', maxWidth: 520 }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src="/zelo-logo.jpeg"
            alt="Zelo — encontre profissionais de confiança"
            width={640} height={640}
            style={{ width: '100%', maxWidth: 200, height: 'auto', marginBottom: 6 }}
          />
          <p className="lead" style={{ maxWidth: 400, margin: '0 auto 26px' }}>
            Diaristas, babás, cuidadores, motoristas particulares, personal trainers, massagistas e fisioterapeutas para cuidar da sua casa, da sua família e da sua saúde.
          </p>
          <h2 style={{ marginBottom: 18 }}>Como você quer usar o Zelo?</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CartaoEscolha
            titulo="Sou cliente"
            texto="Quero contratar profissionais de confiança para minha casa e minha família."
            marcado={role === 'cliente'}
            onClick={() => escolher('cliente')}
          />
          <CartaoEscolha
            titulo="Sou profissional / prestador de serviço"
            texto="Quero oferecer meus serviços para famílias, com verificação e avaliações reais."
            marcado={role === 'profissional'}
            onClick={() => escolher('profissional')}
          />
        </div>

        <p style={{ textAlign: 'center', marginTop: 26, fontSize: 14, color: 'var(--muted)' }}>
          Já tem conta? <Link to="/entrar" style={{ color: 'var(--sage-700)', fontWeight: 600 }}>Entrar</Link>
        </p>
      </main>
    )
  }

  // ------------------------------------------------------ Demais etapas
  const total = etapas.length - 1 // a escolha do papel não conta como "passo"
  const passo = indice
  const valida = etapaValida(etapaAtual)
  const ehUltima = etapaAtual === 'conta'

  return (
    <main className="wrap fade-in" style={{ padding: '24px 0 60px', maxWidth: 460 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button
          type="button"
          onClick={voltar}
          disabled={enviando || sucesso}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer', padding: 0 }}
        >
          ← Voltar
        </button>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{passo} de {total}</span>
      </div>
      <div style={{ height: 6, background: 'var(--line)', borderRadius: 99, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${(passo / total) * 100}%`,
          background: 'var(--sage-700)', borderRadius: 99, transition: 'width .25s'
        }} />
      </div>

      <form onSubmit={avancar} key={etapaAtual} className="fade-in">
        {erro && <div className="erro">{erro}</div>}
        {sucesso && (
          <div style={{
            background: '#E8F2EA', color: 'var(--green)', fontWeight: 600,
            padding: '12px 14px', borderRadius: 10, marginBottom: 14, fontSize: 14.5
          }}>
            ✓ Cadastro realizado com sucesso
          </div>
        )}

        {etapaAtual === 'nome' && (
          <Pergunta titulo="Qual é o seu nome completo?">
            <input
              value={nome} onChange={(e) => setNome(e.target.value)}
              autoFocus autoComplete="name" placeholder="Nome e sobrenome"
              style={{ fontSize: 17 }}
            />
          </Pergunta>
        )}

        {etapaAtual === 'cidade' && (
          <Pergunta titulo="Em qual cidade você está?">
            <select value={cidadeId} onChange={(e) => { setCidadeId(e.target.value); setBairroId('') }} style={{ fontSize: 17 }}>
              {cidades.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Pergunta>
        )}

        {etapaAtual === 'bairro' && (
          <Pergunta
            titulo="Qual é o seu bairro?"
            ajuda={role === 'profissional'
              ? 'O bairro onde você mora. Os bairros onde você atende você escolhe depois, no seu perfil.'
              : 'Usamos para mostrar profissionais perto de você.'}
          >
            <select value={bairroId} onChange={(e) => setBairroId(e.target.value)} style={{ fontSize: 17 }}>
              <option value="">Selecione</option>
              {bairros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome === 'Outro / não listado' ? 'Outros bairros' : b.nome}
                </option>
              ))}
            </select>
          </Pergunta>
        )}

        {etapaAtual === 'categorias' && (
          <Pergunta titulo="Quais serviços você oferece?" ajuda="Pode marcar mais de um.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categorias.map((c) => (
                <OpcaoMarcavel
                  key={c.id}
                  rotulo={`${c.icone ?? ''} ${c.nome}`.trim()}
                  marcado={catSel.includes(c.id)}
                  onClick={() => setCatSel(catSel.includes(c.id)
                    ? catSel.filter((x) => x !== c.id)
                    : [...catSel, c.id])}
                />
              ))}
            </div>
          </Pergunta>
        )}

        {etapaAtual.startsWith('sub:') && (() => {
          const cat = categorias.find((c) => c.id === etapaAtual.slice(4))
          const opcoes = subopcoesPorCategoria[cat?.id] ?? []
          return (
            <Pergunta
              titulo={`${cat?.nome}: o que você faz?`}
              ajuda="Marque todas as opções que você atende."
            >
              <div className="chips">
                {opcoes.map((s) => (
                  <button
                    key={s.id} type="button"
                    className={`chip ${servSel.includes(s.id) ? 'on' : ''}`}
                    onClick={() => setServSel(servSel.includes(s.id)
                      ? servSel.filter((x) => x !== s.id)
                      : [...servSel, s.id])}
                  >{s.nome}</button>
                ))}
              </div>
            </Pergunta>
          )
        })()}

        {etapaAtual === 'valores' && (
          <Pergunta
            titulo="Quanto você cobra?"
            ajuda="Preencha pelo menos um valor. Você pode mudar quando quiser."
          >
            {temTurno && (
              <>
                <CampoValor id="vmt" rotulo="Meio turno — 4h" valor={valorMeioTurno} onChange={setValorMeioTurno} />
                <CampoValor id="vdi" rotulo="Turno integral — 8h" valor={valorDiaria} onChange={setValorDiaria} />
              </>
            )}
            {ehMotorista && (
              <CampoValor id="vkm" rotulo="Valor por km rodado" valor={valorKm} onChange={setValorKm} />
            )}
            {temSessao && (
              <>
                <CampoValor id="vsa" rotulo="Sessão avulsa" valor={valorSessaoAvulsa} onChange={setValorSessaoAvulsa} />
                <CampoValor id="vpm" rotulo="Pacote mensal" valor={valorPacoteMensal} onChange={setValorPacoteMensal} />
              </>
            )}
          </Pergunta>
        )}

        {etapaAtual === 'local' && (
          <Pergunta titulo="Onde você atende?" ajuda="Pode marcar os dois.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <OpcaoMarcavel
                rotulo="Na casa do cliente"
                marcado={atendeDomicilio}
                onClick={() => setAtendeDomicilio(!atendeDomicilio)}
              />
              <OpcaoMarcavel
                rotulo="Em espaço próprio (academia, estúdio ou consultório)"
                marcado={atendeLocalProprio}
                onClick={() => setAtendeLocalProprio(!atendeLocalProprio)}
              />
            </div>
          </Pergunta>
        )}

        {etapaAtual === 'termo' && (
          <TermoConsentimento aceito={aceitouTermo} onChange={setAceitouTermo} />
        )}

        {etapaAtual === 'antecedentes' && (
          <DeclaracaoAntecedentes aceito={aceitouDeclaracao} onChange={setAceitouDeclaracao} />
        )}

        {etapaAtual === 'declaracoes' && (
          <Pergunta titulo="Suas declarações">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
              <input
                type="checkbox" checked={declarouVerdade}
                onChange={(e) => setDeclarouVerdade(e.target.checked)}
                style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 15, lineHeight: 1.45 }}>
                Declaro que todas as informações fornecidas são verdadeiras e atualizadas.
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox" checked={declarouApto}
                onChange={(e) => setDeclarouApto(e.target.checked)}
                style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 15, lineHeight: 1.45 }}>
                Declaro estar legalmente apto(a) para exercer as atividades anunciadas.
              </span>
            </label>
          </Pergunta>
        )}

        {etapaAtual === 'conta' && (
          <Pergunta
            titulo="Por último: crie seu acesso"
            ajuda="É com este e-mail e senha que você vai entrar no Zelo."
          >
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoFocus autoComplete="email" inputMode="email" autoCapitalize="none"
              />
            </div>
            <div className="field">
              <label htmlFor="senha">Senha (mínimo 6 caracteres)</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="senha" type={mostrarSenha ? 'text' : 'password'} value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password" minLength={6}
                  style={{ paddingRight: 70 }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--sage-700)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >{mostrarSenha ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            {erro?.startsWith('Este e-mail já tem conta') && (
              <p style={{ fontSize: 14 }}>
                <Link to="/entrar" style={{ color: 'var(--sage-700)', fontWeight: 600 }}>Entrar na minha conta</Link>
              </p>
            )}
            {role === 'profissional' && (
              <div className="note warn">
                <p>
                  <b>Depois do cadastro: verificação.</b> Você envia documento de identidade e uma
                  selfie. Seu perfil entra na busca assim que tudo for aprovado. Seus documentos
                  ficam privados.
                </p>
              </div>
            )}
          </Pergunta>
        )}

        <button
          className="btn full"
          type="submit"
          disabled={!valida || enviando || sucesso}
          style={{ marginTop: 22, padding: 16, fontSize: 16 }}
        >
          {ehUltima
            ? (sucesso ? 'Entrando…' : enviando ? 'Criando conta…' : 'Criar conta')
            : 'Continuar'}
        </button>
      </form>
    </main>
  )
}

// ---------------------------------------------------------------- Peças
function Pergunta({ titulo, ajuda, children }) {
  return (
    <div>
      <h2 style={{ marginBottom: ajuda ? 6 : 18 }}>{titulo}</h2>
      {ajuda && <p className="lead" style={{ marginBottom: 18, fontSize: 15 }}>{ajuda}</p>}
      {children}
    </div>
  )
}

function CartaoEscolha({ titulo, texto, marcado, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        textAlign: 'left', cursor: 'pointer', padding: '22px 20px', background: 'var(--paper)',
        border: `2px solid ${marcado ? 'var(--sage-700)' : 'var(--line)'}`
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--sage-900)', marginBottom: 4 }}>{titulo}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>{texto}</div>
    </button>
  )
}

function OpcaoMarcavel({ rotulo, marcado, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        padding: '15px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 16,
        background: marcado ? 'var(--sage-900)' : 'var(--paper)',
        color: marcado ? '#fff' : 'var(--ink, inherit)',
        border: `1.5px solid ${marcado ? 'var(--sage-900)' : 'var(--line)'}`,
        transition: '.15s'
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
        border: `2px solid ${marcado ? '#fff' : 'var(--line)'}`,
        display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700
      }}>{marcado ? '✓' : ''}</span>
      {rotulo}
    </button>
  )
}

function CampoValor({ id, rotulo, valor, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{rotulo} (R$)</label>
      <input
        id={id} type="number" inputMode="decimal" step="0.01" min="0"
        value={valor} onChange={(e) => onChange(e.target.value)}
        placeholder="0,00" style={{ fontSize: 17 }}
      />
    </div>
  )
}
