import { useEffect, useState } from 'react'
import {
  atualizarPerfil, atualizarProfissional, obterProfissional,
  definirCategorias, definirBairros, obterCategoriasBairros,
  listarCategoriasAtivas, listarCidadesAtivas, listarBairros,
  obterContato, salvarContato
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
  const [valorHora, setValorHora] = useState('')
  const [valorDiaria, setValorDiaria] = useState('')
  const [telefone, setTelefone] = useState('')

  const [categorias, setCategorias] = useState([])
  const [catSel, setCatSel] = useState([])
  const [bairros, setBairros] = useState([])
  const [bairroSel, setBairroSel] = useState([])

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [ok, setOk] = useState(false)

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
        setIdade(prof.idade ?? '')
        setExperiencia(prof.experiencia ?? '')
        setEspecialidades((prof.especialidades ?? []).join(', '))
        setValorHora(prof.valor_hora ?? '')
        setValorDiaria(prof.valor_diaria ?? '')
      } else {
        setNome(perfil.nome ?? '')
      }

      setTelefone(contato?.telefone ?? '')
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

  function alternar(lista, setLista, id) {
    setLista(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])
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
        valor_hora: valorHora ? Number(valorHora) : null,
        valor_diaria: valorDiaria ? Number(valorDiaria) : null
      })
      await definirCategorias(perfil.id, catSel)
      await definirBairros(perfil.id, bairroSel)
      if (telefone) await salvarContato(perfil.id, { telefone })
      setOk(true)
      onSalvo?.()
    } catch {
      setErro('Não foi possível salvar. Tente novamente.')
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
          {bairros.map((b) => (
            <button
              key={b.id} type="button"
              className={`chip ${bairroSel.includes(b.id) ? 'on' : ''}`}
              onClick={() => alternar(bairroSel, setBairroSel, b.id)}
            >{b.nome}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Seus valores</h3>
        <div className="row">
          <div className="field">
            <label htmlFor="vh">Valor por hora (R$)</label>
            <input id="vh" type="number" step="0.01" value={valorHora} onChange={(e) => setValorHora(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="vd">Valor por diária (R$)</label>
            <input id="vd" type="number" step="0.01" value={valorDiaria} onChange={(e) => setValorDiaria(e.target.value)} />
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
          Você define seus próprios valores e aceita apenas os serviços que quiser.
        </p>
      </div>

      <button className="btn full" type="submit" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar perfil'}
      </button>
    </form>
  )
}
