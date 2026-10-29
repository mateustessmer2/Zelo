// ============================================================================
// EDGE FUNCTION — previa-perfil
// ----------------------------------------------------------------------------
// Roda na frente de /profissional/<id>. Pega o index.html normal do app e
// troca as meta tags Open Graph por versões específicas da profissional:
// título com o primeiro nome, descrição com categorias e nota, e a imagem
// gerada por `og-profissional`. É o que o WhatsApp lê para montar a prévia
// do link — ele não executa o app, só lê o HTML.
//
// Se algo falhar (perfil não visível, banco fora do ar), devolve a página
// sem alteração: a prévia cai no padrão do Zelo e o app abre normalmente.
// ============================================================================

import { buscarPrevia, idDoCaminho, notaFormatada } from '../compartilhado/previa.ts'

type Context = { next: () => Promise<Response> }

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function trocarMeta(html: string, propriedade: string, valor: string) {
  const re = new RegExp(`<meta\\s+property="${propriedade}"\\s+content="[^"]*"\\s*/?>`)
  const tag = `<meta property="${propriedade}" content="${esc(valor)}" />`
  return re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`)
}

export default async (req: Request, context: Context) => {
  const resposta = await context.next()
  if (!(resposta.headers.get('content-type') ?? '').includes('text/html')) return resposta

  const url = new URL(req.url)
  const id = idDoCaminho(url.pathname, '/profissional/')
  if (!id) return resposta

  const previa = await buscarPrevia(id)
  if (!previa) return resposta

  const categorias = previa.categorias.join(', ') || 'Profissional'
  const nota = notaFormatada(previa)
  const titulo = `${previa.nome} · ${categorias} | Zelo`
  const descricao = [
    'Identidade verificada pelo Zelo.',
    nota ? `Nota ${nota} em ${previa.total_avaliacoes} ${previa.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'}.` : null,
    'Profissionais de confiança em Pelotas.'
  ].filter(Boolean).join(' ')
  const imagem = `${url.origin}/og/profissional/${id}.png`

  let html = await resposta.text()
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)}</title>`)
  html = trocarMeta(html, 'og:title', titulo)
  html = trocarMeta(html, 'og:description', descricao)
  html = trocarMeta(html, 'og:url', `${url.origin}${url.pathname}`)
  html = trocarMeta(html, 'og:image', imagem)
  html = trocarMeta(html, 'og:image:width', '1200')
  html = trocarMeta(html, 'og:image:height', '630')
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${esc(descricao)}" />`
  )
  if (!html.includes('twitter:card')) {
    html = html.replace('</head>', '  <meta name="twitter:card" content="summary_large_image" />\n</head>')
  }

  const cabecalhos = new Headers(resposta.headers)
  cabecalhos.delete('content-length')
  return new Response(html, { status: resposta.status, headers: cabecalhos })
}

export const config = { path: '/profissional/*' }
