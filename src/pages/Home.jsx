import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarCategoriasAtivas } from '../lib/api'

/**
 * Home. Uma pergunta, três cartões, um botão.
 *
 * As categorias vêm do banco — adicionar uma nova é inserir linha, não
 * mexer em código. O mesmo vale para cidades.
 */
export default function Home() {
  const [categorias, setCategorias] = useState([])
  const [selecionada, setSelecionada] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    listarCategoriasAtivas().then(setCategorias).catch(() => setCategorias([]))
  }, [])

  return (
    <main className="wrap fade-in" style={{ paddingBottom: 60 }}>
      <section style={{ padding: '44px 0 30px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--sage-500)', marginBottom: 16 }}>
          Pelotas · RS
        </div>
        <h1 style={{ maxWidth: '14ch', margin: '0 auto 14px' }}>O que você precisa hoje?</h1>
        <p className="lead" style={{ maxWidth: '34ch', margin: '0 auto', fontSize: 17 }}>
          Profissionais com identidade e antecedentes verificados, perto de você.
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(categorias.length || 3, 3)}, 1fr)`, gap: 14, margin: '34px 0 8px' }}>
        {categorias.map((c) => {
          const on = selecionada?.id === c.id
          return (
            <button
              key={c.id}
              onClick={() => setSelecionada(c)}
              style={{
                background: on ? 'var(--sage-900)' : 'var(--paper)',
                border: `1.5px solid ${on ? 'var(--sage-700)' : 'var(--line)'}`,
                borderRadius: 'var(--radius)', padding: '26px 18px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                fontFamily: 'inherit', transition: '.18s'
              }}
            >
              <span style={{ fontSize: 38, lineHeight: 1 }}>{c.icone}</span>
              <span style={{ fontWeight: 600, fontSize: 15, color: on ? 'var(--paper)' : 'var(--sage-900)' }}>{c.nome}</span>
            </button>
          )
        })}
      </div>

      <button
        className="btn"
        style={{ display: 'block', width: '100%', maxWidth: 340, margin: '26px auto 0', padding: 16, fontSize: 16 }}
        disabled={!selecionada}
        onClick={() => navigate(`/buscar?categoria=${selecionada.id}&nome=${encodeURIComponent(selecionada.nome)}`)}
      >
        Encontrar profissionais
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 26, flexWrap: 'wrap', margin: '40px 0 10px', paddingTop: 26, borderTop: '1px solid var(--line)' }}>
        <Selo texto="Identidade verificada" />
        <Selo texto="Antecedentes checados" />
        <Selo texto="Avaliações reais" />
      </div>
    </main>
  )
}

function Selo({ texto }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--sage-700)', fontWeight: 500 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a5244" strokeWidth="2">
        <path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3z" /><path d="m9 12 2 2 4-4" />
      </svg>
      {texto}
    </div>
  )
}
