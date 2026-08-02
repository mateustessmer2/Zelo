import { useEffect, useState } from 'react'
import {
  atualizarPerfil, atualizarProfissional, obterProfissional,
  definirCategorias, definirBairros, obterCategoriasBairros,
  listarCategoriasAtivas, listarCidadesAtivas, listarBairros,
  listarServicosDisponiveis, obterServicosSelecionados, definirServicos,
  obterContato, salvarContato, enviarFotoPerfil
} from '../lib/api'
import { useAuth } from '../hooks/useAuth'

/**
 * Edição do perfil da profissional.
 *
 * Ela define os próprios valores, categorias e bairros. Não há preço sugerido
 * nem faixa "recomendada" pela plataforma: precificação imposta é um dos
 * indícios de subordinação que caracterizam vínculo empregatício.
 */
export default function EditarPerfil({ onSalvo }) {
  const { perfil } = useAuth()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [idade, setIdade] = useState('')
  const [experiencia, setExperiencia] = useState('')
  const [especialidades, setEspecialidades] = useState('')
  const [valorMeioTurno, setValorMeioTurno] = useState('')
  const [valorKm, setValorKm] = useState('')
  const [valorDiaria, setValorDiaria] = useState('')
  const [atendeIntermunicipal, setAtendeIntermunicipal] = useState(false)
  const [veiculoModelo, setVeiculoModelo] = useState('')
  const [veiculoAno, setVeiculoAno] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const [categorias, setCategorias] = useState([])
  const [catSel, setCatSel] = useState([])

  // Motorista cobra por km, não por turno — o campo de valor correspondente
  // só faz sentido aparecer quando essa categoria está entre as marcadas.
  const ehMotorista = categorias.some((c) => c.slug === 'motorista-particular' && catSel.includes(c.id))

  // Categorias com subopções marcáveis (serviços específicos dentro dela).
  // Generalizado a partir da migração 23 (que só cobria Limpeza
  // Residencial): agora qualquer categoria com linhas em
  // `servicos_disponiveis` — hoje Limpeza Residencial e Cuidador
  // Domiciliar/Hospitalar (migração 28) — mostra a lista, sem precisar
  // de mais um flag específico por categoria a cada nova que ganhar
  // subopções.
  const SLUGS_COM_SUBOPCOES = ['limpeza-residencial', 'cuidador-domiciliar-hospitalar']
  const categoriaComSubopcoes = categorias.find(
    (c) => SLUGS_COM_SUBOPCOES.includes(c.slug) && catSel.includes(c.id)
  )
  const temSubopcoes = !!categoriaComSubopcoes
  const [servicosDisponiveis, setServicosDisponiveis] = useState([])
  const [servicosSel, setServicosSel] = useState([])
  const [servicoOutro, setServicoOutro] = useState('')
  const [bairros, setBairros] = useState([])
  const [bairroSel, setBairroSel] = useState([])
  const [atendeTodos, setAtendeTodos] = useState(false)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [ok, setOk] = useState(false)
  const [pontuacao, setPontuacao] = useState(0)
  const [fotoUrl, setFotoUrl] = useState(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState(null)

  useEffect(() => {
    if (!perfil?.id) return
    let ativo = true

    // Cada chamada é independente: se uma falhar, as outras ainda preenchem.
    // Antes isto era um Promise.all — e a rejeição de qualquer uma deixava
    // as listas de categorias e bairros vazias, sem erro visível.
    async function carregar() {
      const [prof, sel, cats, cidades, contato] = await Promise.all([
        obterProfissional(perfil.id).catch(() => null),
        obterCategoriasBairros(perfil.id).catch(() => ({ categoriaIds: [], bairroIds: [] })),
        listarCategoriasAtivas().catch(() => []),
        listarCidadesAtivas().catch(() => []),
        obterContato(perfil.id).catch(() => null)
      ])
      if (!ativo) return

      if (prof) {
        setNome(prof.perfis?.nome ?? perfil.nome ?? '')
        setDescricao(prof.descricao ?? '')
        setPontuacao(prof.pontuacao_perfil ?? 0)
        setFotoUrl(prof.perfis?.foto_url ?? null)
        setIdade(prof.idade ?? '')
        setExperiencia(prof.experiencia ?? '')
        setEspecialidades((prof.especialidades ?? []).join(', '))
        setValorMeioTurno(prof.valor_meio_turno ?? '')
        setValorKm(prof.valor_km ?? '')
        setAtendeIntermunicipal(!!prof.atende_intermunicipal)
        setVeiculoModelo(prof.veiculo_modelo ?? '')
        setVeiculoAno(prof.veiculo_ano ?? '')
        setValorDiaria(prof.valor_diaria ?? '')
        setAtendeTodos(!!prof.atende_todos_bairros)
        setServicoOutro(prof.servico_outro ?? '')
      } else {
        setNome(perfil.nome ?? '')
      }

      setTelefone(contato?.telefone ?? '')
      setWhatsapp(contato?.whatsapp ?? '')
      setCatSel(sel.categoriaIds)
      setBairroSel(sel.bairroIds)
      setCategorias(cats)

      if (cidades.length) {
        const bs = await listarBairros(cidades[0].id).catch(() => [])
        if (ativo) setBairros(bs)
      }
      if (ativo) setCarregando(false)
    }

    carregar().catch(() => {
      if (!ativo) return
      setErro('Não foi possível carregar seu perfil.')
      setCarregando(false)
    })

    return () => { ativo = false }
  }, [perfil?.id])

  // Serviços específicos só fazem sentido depois que sabemos se ALGUMA
  // categoria com subopções está entre as marcadas — por isso um efeito
  // separado, disparado quando `categoriaComSubopcoes` é resolvida
  // (assim que a lista de categorias carrega).
  useEffect(() => {
    if (!perfil?.id || !categoriaComSubopcoes) return
    let ativo = true

    Promise.all([
      listarServicosDisponiveis(categoriaComSubopcoes.id).catch(() => []),
      obterServicosSelecionados(perfil.id).catch(() => [])
    ]).then(([disponiveis, selecionados]) => {
      if (!ativo) return
      setServicosDisponiveis(disponiveis)
      setServicosSel(selecionados)
    })

    return () => { ativo = false }
  }, [perfil?.id, categoriaComSubopcoes?.id])

  function alternar(lista, setLista, id) {
    setLista(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])
  }

  async function trocarFoto(arquivo) {
    if (!arquivo || !perfil?.id) return
    setEnviandoFoto(true)
    setErroFoto(null)
    try {
      const url = await enviarFotoPerfil({ perfilId: perfil.id, arquivo })
      setFotoUrl(url)
    } catch {
      setErroFoto('Não foi possível enviar a foto. Tente uma imagem menor.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setOk(false)
    try {
      await atualizarPerfil(perfil.id, { nome })
      await atualizarProfissional(perfil.id, {
        descricao,
        idade: idade ? Number(idade) : null,
        experiencia,
        especialidades: especialidades
          ? especialidades.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        valor_meio_turno: valorMeioTurno ? Number(valorMeioTurno) : null,
        valor_diaria: valorDiaria ? Number(valorDiaria) : null,
        valor_km: valorKm ? Number(valorKm) : null,
        atende_intermunicipal: ehMotorista ? atendeIntermunicipal : false,
        veiculo_modelo: ehMotorista && veiculoModelo.trim() ? veiculoModelo.trim() : null,
        veiculo_ano: ehMotorista && veiculoAno ? Number(veiculoAno) : null,
        atende_todos_bairros: atendeTodos,
        servico_outro: temSubopcoes && servicoOutro.trim() ? servicoOutro.trim() : null
      })
      await definirCategorias(perfil.id, catSel)
      // Serviços específicos só se aplicam a categorias com subopções; se
      // a categoria for desmarcada, os vínculos ficam órfãos no banco (a
      // tabela não é limpa aqui) — inofensivo, porque a tela nunca os
      // exibiria de novo sem essa categoria marcada.
      if (temSubopcoes) await definirServicos(perfil.id, servicosSel)
      // Bairros marcados individualmente só importam quando "atende todos"
      // está desligado — mas gravamos do jeito que estiver na tela, sem
      // apagar o histórico de bairros caso ela desmarque depois.
      await definirBairros(perfil.id, bairroSel)
      if (telefone || whatsapp) await salvarContato(perfil.id, { telefone, whatsapp })
      setOk(true)
      onSalvo?.()
    } catch (err) {
      // Mensagem real em vez de genérica — sem console à mão, este texto é
      // a única pista de qual coluna ou permissão falhou.
      setErro(err?.message ?? 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <div className="loading">Carregando perfil…</div>

  return (
    <form onSubmit={salvar}>
      <h2>Editar perfil</h2>
      <p className="lead" style={{ marginBottom: 22 }}>
        É isso que as famílias veem quando encontram você na busca.
      </p>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 12 }}>Foto de perfil</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {fotoUrl ? (
            <img
              src={fotoUrl} alt="Sua foto de perfil"
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, flexShrink: 0 }}>
              {nome?.[0] ?? '?'}
            </div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              disabled={enviandoFoto}
              onChange={(e) => trocarFoto(e.target.files?.[0])}
              style={{ fontSize: 13.5 }}
            />
            {erroFoto && <p style={{ fontSize: 12.5, color: '#c0392b', marginTop: 6 }}>{erroFoto}</p>}
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              Uma foto de rosto, de frente, ajuda a família a te reconhecer.
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Perfil {pontuacao}/5 completo</span>
        </div>
        <div style={{ background: 'var(--line)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${(pontuacao / 5) * 100}%`, height: '100%',
            background: pontuacao === 5 ? 'var(--green)' : 'var(--coral)',
            borderRadius: 999, transition: 'width .3s'
          }} />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8, marginBottom: 0 }}>
          {pontuacao === 5
            ? 'Perfil completo! Isso ajuda você a aparecer primeiro nas buscas.'
            : 'Foto, descrição, valores, agenda e uma referência aprovada aumentam sua posição na busca.'}
        </p>
      </div>

      {erro && <div className="erro">{erro}</div>}
      {ok && (
        <div style={{
          background: 'var(--green-bg)', color: 'var(--green)', padding: '13px 15px',
          borderRadius: 12, fontSize: 13.5, marginBottom: 14, fontWeight: 600
        }}>
          Perfil atualizado.
        </div>
      )}

      <div className="card">
        <h3>Dados básicos</h3>
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="idade">Idade</label>
            <input id="idade" type="number" value={idade} onChange={(e) => setIdade(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="tel">Telefone</label>
            <input id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(53) 9 0000-0000" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="whats">WhatsApp</label>
          <input id="whats" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(53) 9 0000-0000" />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            O cliente é direcionado para esse número assim que solicita um serviço com você.
          </p>
        </div>
        <div className="field">
          <label htmlFor="desc">Uma frase sobre você</label>
          <textarea
            id="desc" rows="3" value={descricao} onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Trabalho com limpeza residencial há 12 anos, sou detalhista e pontual."
          />
        </div>
        <div className="field">
          <label htmlFor="exp">Experiência</label>
          <input
            id="exp" value={experiencia} onChange={(e) => setExperiencia(e.target.value)}
            placeholder="Ex.: 12 anos em limpeza residencial"
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="esp">Especialidades <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(separadas por vírgula)</span></label>
          <input
            id="esp" value={especialidades} onChange={(e) => setEspecialidades(e.target.value)}
            placeholder="Limpeza pesada, organização, passar roupa"
          />
        </div>
      </div>

      <div className="card">
        <h3>O que você faz</h3>
        <div className="chips">
          {categorias.map((c) => (
            <button
              key={c.id} type="button"
              className={`chip ${catSel.includes(c.id) ? 'on' : ''}`}
              onClick={() => alternar(catSel, setCatSel, c.id)}
            >{c.icone} {c.nome}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Bairros que você atende</h3>
        <div className="chips">
          <button
            type="button"
            className={`chip ${atendeTodos ? 'on' : ''}`}
            onClick={() => setAtendeTodos(!atendeTodos)}
          >TODOS</button>
          {!atendeTodos && bairros.map((b) => (
            <button
              key={b.id} type="button"
              className={`chip ${bairroSel.includes(b.id) ? 'on' : ''}`}
              onClick={() => alternar(bairroSel, setBairroSel, b.id)}
            >{b.nome}</button>
          ))}
        </div>
        {atendeTodos && (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>
            Você vai aparecer em buscas de qualquer bairro. Toque em "TODOS" de novo para escolher bairros específicos.
          </p>
        )}
      </div>

      <div className="card">
        <h3>Seus valores</h3>
        <div className="row">
          <div className="field">
            <label htmlFor="vh">Meio turno — 4h (R$)</label>
            <input id="vh" type="number" step="0.01" value={valorMeioTurno} onChange={(e) => setValorMeioTurno(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="vd">Turno integral — 8h (R$)</label>
            <input id="vd" type="number" step="0.01" value={valorDiaria} onChange={(e) => setValorDiaria(e.target.value)} />
          </div>
        </div>
        {ehMotorista && (
          <div className="field">
            <label htmlFor="vkm">Valor por km rodado (R$)</label>
            <input id="vkm" type="number" step="0.01" value={valorKm} onChange={(e) => setValorKm(e.target.value)} />
          </div>
        )}
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
          Você define seus próprios valores e aceita apenas os serviços que quiser.
        </p>
      </div>

      {ehMotorista && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>Área de atendimento e veículo</h3>

          <div className="field">
            <label>Você faz corrida entre cidades (intermunicipal)?</label>
            <div className="chips">
              <button
                type="button"
                className={`chip ${!atendeIntermunicipal ? 'on' : ''}`}
                onClick={() => setAtendeIntermunicipal(false)}
              >Só dentro do município</button>
              <button
                type="button"
                className={`chip ${atendeIntermunicipal ? 'on' : ''}`}
                onClick={() => setAtendeIntermunicipal(true)}
              >Também intermunicipal</button>
            </div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <div className="field">
              <label htmlFor="veic-modelo">Modelo do carro</label>
              <input
                id="veic-modelo" value={veiculoModelo}
                onChange={(e) => setVeiculoModelo(e.target.value)}
                placeholder="Ex.: Chevrolet Onix"
              />
            </div>
            <div className="field">
              <label htmlFor="veic-ano">Ano</label>
              <input
                id="veic-ano" type="number" value={veiculoAno}
                onChange={(e) => setVeiculoAno(e.target.value)}
                placeholder="Ex.: 2020"
              />
            </div>
          </div>
        </div>
      )}

      {temSubopcoes && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>Quais serviços você oferece?</h3>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>
            Marque todos os que se aplicam.
          </p>
          <div className="chips">
            {servicosDisponiveis.map((s) => (
              <button
                key={s.id} type="button"
                className={`chip ${servicosSel.includes(s.id) ? 'on' : ''}`}
                onClick={() => alternar(servicosSel, setServicosSel, s.id)}
              >{s.nome}</button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="servico-outro">Outro</label>
            <input
              id="servico-outro" value={servicoOutro}
              onChange={(e) => setServicoOutro(e.target.value)}
              placeholder="Algum serviço que não está na lista"
            />
          </div>
        </div>
      )}

      <button className="btn full" type="submit" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar perfil'}
      </button>
    </form>
  )
}
