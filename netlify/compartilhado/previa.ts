// Utilitários compartilhados pelas duas Edge Functions da prévia do perfil.
// Fica fora de edge-functions/ para o Netlify não tratar como uma função.

declare const Netlify: { env: { get(nome: string): string | undefined } }

export type Previa = {
  nome: string
  foto_url: string | null
  categorias: string[]
  nota_media: number | null
  total_avaliacoes: number
}

const ID_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function idDoCaminho(caminho: string, prefixo: string): string | null {
  const id = caminho.slice(prefixo.length).split('/')[0].replace(/\.png$/i, '')
  return ID_VALIDO.test(id) ? id.toLowerCase() : null
}

/** Chama a função `previa_profissional` (migração 31) com a chave pública. */
export async function buscarPrevia(id: string): Promise<Previa | null> {
  const url = Netlify.env.get('SUPABASE_URL') ?? Netlify.env.get('VITE_SUPABASE_URL')
  const chave = Netlify.env.get('SUPABASE_ANON_KEY') ?? Netlify.env.get('VITE_SUPABASE_ANON_KEY')
  if (!url || !chave) return null
  try {
    const resp = await fetch(`${url}/rest/v1/rpc/previa_profissional`, {
      method: 'POST',
      headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: id })
    })
    if (!resp.ok) return null
    const dados = await resp.json()
    return dados && dados.nome ? dados as Previa : null
  } catch {
    return null
  }
}

export function notaFormatada(p: Previa): string | null {
  if (!p.nota_media || !p.total_avaliacoes) return null
  return Number(p.nota_media).toFixed(1).replace('.', ',')
}
