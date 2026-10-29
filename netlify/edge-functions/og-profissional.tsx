// ============================================================================
// EDGE FUNCTION — og-profissional
// ----------------------------------------------------------------------------
// Gera a imagem da prévia (1200×630) de /og/profissional/<id>.png: foto,
// primeiro nome, categorias, nota e o selo "Identidade verificada pelo Zelo".
// É a imagem que aparece quando o link do perfil é colado no WhatsApp.
//
// Usa og_edge (port do @vercel/og para Deno). Só elementos simples: o
// renderizador (Satori) entende um subconjunto de CSS, e toda div com mais
// de um filho precisa de display:flex. Estrela e ✓ são desenhados em SVG
// para não depender de a fonte ter esses símbolos.
// ============================================================================

import React from 'https://esm.sh/react@18.2.0'
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.6/mod.ts'
import { buscarPrevia, idDoCaminho, notaFormatada } from '../compartilhado/previa.ts'

const COR = {
  fundo: '#f7f4ee', cartao: '#fffdf9', verde: '#25352b', verdeMedio: '#3a5244',
  verdeClaro: '#dfe7e0', coral: '#e07856', cinza: '#71786f', linha: '#e6e1d7'
}

// Fraunces no nome e Inter no resto, como no app. Se o Google Fonts não
// responder, cai na fonte padrão do og_edge — a imagem sai do mesmo jeito.
let fontesCache: Promise<unknown[] | undefined> | null = null
function carregarFontes() {
  fontesCache ??= (async () => {
    try {
      const baixar = async (familia: string, peso: number) => {
        const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${familia}:wght@${peso}`)).text()
        const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
        if (!url) throw new Error('fonte sem ttf')
        return await (await fetch(url)).arrayBuffer()
      }
      const [fraunces, inter, interForte] = await Promise.all([
        baixar('Fraunces', 500), baixar('Inter', 400), baixar('Inter', 600)
      ])
      return [
        { name: 'Fraunces', data: fraunces, weight: 500, style: 'normal' },
        { name: 'Inter', data: inter, weight: 400, style: 'normal' },
        { name: 'Inter', data: interForte, weight: 600, style: 'normal' }
      ]
    } catch {
      return undefined
    }
  })()
  return fontesCache
}

/** Foto vira data: URI — só JPEG/PNG até 4 MB; qualquer outra coisa, sem foto. */
async function fotoComoDataUri(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const r = await fetch(url)
    const tipo = (r.headers.get('content-type') ?? '').split(';')[0].trim()
    if (!r.ok || !['image/jpeg', 'image/png'].includes(tipo)) return null
    const bytes = new Uint8Array(await r.arrayBuffer())
    if (bytes.length > 4_000_000) return null
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return `data:${tipo};base64,${btoa(bin)}`
  } catch {
    return null
  }
}

function Estrela() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24">
      <path fill={COR.coral} d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill={COR.verde} />
      <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async (req: Request) => {
  const url = new URL(req.url)
  const id = idDoCaminho(url.pathname, '/og/profissional/')
  const previa = id ? await buscarPrevia(id) : null
  if (!previa) return Response.redirect(`${url.origin}/zelo-logo.jpeg`, 302)

  const [foto, fontes] = await Promise.all([fotoComoDataUri(previa.foto_url), carregarFontes()])
  const temFontes = Array.isArray(fontes)
  const serif = temFontes ? 'Fraunces' : undefined
  const sans = temFontes ? 'Inter' : undefined
  const nota = notaFormatada(previa)
  const categorias = previa.categorias.slice(0, 3).join(' · ') || 'Profissional'

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', background: COR.fundo,
        padding: 56, fontFamily: sans
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 56,
          background: COR.cartao, borderRadius: 40, border: `3px solid ${COR.linha}`, padding: '0 64px'
        }}>
          {foto ? (
            <img src={foto} width={300} height={300} style={{ borderRadius: 150, objectFit: 'cover', border: `8px solid ${COR.verdeClaro}` }} />
          ) : (
            <div style={{
              width: 300, height: 300, borderRadius: 150, background: COR.verdeMedio, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 140, fontFamily: serif
            }}>
              {previa.nome[0]?.toUpperCase() ?? 'Z'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 30, color: COR.verde, fontFamily: serif }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: COR.coral }} />
              Zelo
            </div>

            <div style={{ fontSize: 84, color: COR.verde, fontFamily: serif, lineHeight: 1.05, marginTop: 18 }}>
              {previa.nome}
            </div>
            <div style={{ fontSize: 32, color: COR.cinza, marginTop: 10 }}>{categorias}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 30, fontSize: 32, color: COR.verde, fontWeight: 600 }}>
              {nota ? (
                <>
                  <Estrela />
                  {nota}
                  <span style={{ fontWeight: 400, color: COR.cinza, fontSize: 28, marginLeft: 4 }}>
                    ({previa.total_avaliacoes} {previa.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'})
                  </span>
                </>
              ) : (
                <span style={{ fontWeight: 400, color: COR.cinza, fontSize: 28 }}>Novo no Zelo</span>
              )}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginTop: 26, alignSelf: 'flex-start',
              background: COR.verdeClaro, color: COR.verde, borderRadius: 999, padding: '12px 26px 12px 16px',
              fontSize: 27, fontWeight: 600
            }}>
              <Check />
              Identidade verificada pelo Zelo
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200, height: 630,
      ...(temFontes ? { fonts: fontes } : {}),
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' }
    }
  )
}

export const config = { path: '/og/profissional/*' }
