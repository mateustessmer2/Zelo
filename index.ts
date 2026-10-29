// ============================================================================
// EDGE FUNCTION — enviar-referencia
// ----------------------------------------------------------------------------
// Envia por e-mail ao cliente um RESUMO das referências de trabalho
// aprovadas da profissional que ele acabou de contratar — com nome e
// telefone PARCIAIS (ex.: "Ana S." e "(53) •••••••-12"). Os dados
// completos nunca saem daqui: para saber mais, o cliente fala direto com
// a profissional que fez as indicações. Chamada pelo FRONTEND (supabase.functions.invoke), não por
// webhook — o disparo depende do aceite explícito do disclaimer, que é
// uma ação do usuário, não um evento puro de banco.
//
// POR QUE A LÓGICA REAL PRECISA VIVER AQUI, E NÃO NO FRONTEND
//
// O cliente nunca deve ler nome/telefone da referência antes deste
// momento — nem via RLS, nem via alguma query "adiantada". Esta função
// roda com service role e é o ÚNICO lugar que lê `referencias_trabalho`
// para entregar ao cliente. Ela reconfirma tudo que o frontend já
// checou (existe referência aprovada, o booking é do cliente que está
// pedindo) antes de enviar — nunca confia cegamente no que o app mandou.
//
// SECRETS (os mesmos já usados pelas outras funções)
//   RESEND_API_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (padrão)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const REMETENTE = 'Zelo <contato@zeloemcasa.com.br>'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function enviarEmail(destinatario: string, assunto: string, corpoHtml: string) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: REMETENTE,
      to: [destinatario],
      subject: assunto,
      html: corpoHtml
    })
  })
  const corpo = await resp.json()
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${JSON.stringify(corpo)}`)
  return corpo
}

/** Primeiro nome + inicial do último sobrenome ("Ana Souza Lima" → "Ana L.").
 *  Nunca o nome completo. */
function nomeParcial(nomeCompleto: string) {
  const partes = (nomeCompleto ?? '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return 'Contato'
  if (partes.length === 1) return partes[0]
  return `${partes[0]} ${partes[partes.length - 1][0].toUpperCase()}.`
}

/** Mostra só o DDD e os 2 últimos dígitos ("53999881234" → "(53) •••••••-34").
 *  Nunca o número completo. */
function telefoneParcial(telefone: string) {
  let d = (telefone ?? '').replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  if (d.length < 4) return '••••'
  const fim = d.slice(-2)
  if (d.length >= 10) {
    const ddd = d.slice(0, 2)
    return `(${ddd}) ${'•'.repeat(d.length - 4)}-${fim}`
  }
  return `${'•'.repeat(d.length - 2)}-${fim}`
}

/** Escapa texto vindo do banco antes de colocar no HTML do e-mail. */
function esc(t: string) {
  return (t ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

Deno.serve(async (req) => {
  try {
    // A invocação via supabase.functions.invoke já inclui o token da
    // sessão do usuário no header Authorization. Extraímos o id do
    // cliente a partir dele — não confiamos em um `clienteId` vindo do
    // corpo da requisição, que poderia ser forjado.
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ erro: 'não autenticado' }), { status: 401 })
    }
    const clienteId = userData.user.id

    const { bookingId, versaoDisclaimer } = await req.json()
    if (!bookingId || !versaoDisclaimer) {
      return new Response(JSON.stringify({ erro: 'bookingId e versaoDisclaimer são obrigatórios' }), { status: 400 })
    }

    // Confirma que o booking existe e pertence a ESTE cliente — nunca
    // confia no id vindo do frontend sem checar contra o dono real.
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, cliente_id, profissional_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking || booking.cliente_id !== clienteId) {
      return new Response(JSON.stringify({ erro: 'booking inválido para este cliente' }), { status: 403 })
    }

    // Todas as referências aprovadas e não bloqueadas. Como o e-mail só
    // leva dados parciais, não há por que limitar a uma.
    const { data: referencias } = await supabase
      .from('referencias_trabalho')
      .select('id, nome_referencia, telefone')
      .eq('profissional_id', booking.profissional_id)
      .eq('status', 'aprovado')
      .eq('bloqueada', false)
      .order('created_at', { ascending: false })

    if (!referencias?.length) {
      // Pode acontecer se a referência foi bloqueada pelo admin entre o
      // momento em que a tela carregou a contagem e o clique em
      // contratar — não é erro do cliente, só não há o que enviar agora.
      return new Response(JSON.stringify({ ok: true, ignorado: 'nenhuma referência disponível no momento' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { data: emailCliente } = await supabase.auth.admin.getUserById(clienteId)
    const destino = emailCliente?.user?.email
    if (!destino) {
      return new Response(JSON.stringify({ erro: 'e-mail do cliente não encontrado' }), { status: 500 })
    }

    // Nome da profissional, para o cliente saber com quem falar.
    const { data: prof } = await supabase
      .from('perfis')
      .select('nome')
      .eq('id', booking.profissional_id)
      .maybeSingle()
    const nomeProf = esc((prof?.nome ?? '').trim().split(/\s+/)[0] || 'a profissional')

    const itens = referencias.map((r) => `
        <li style="margin-bottom:6px">
          <b>${esc(nomeParcial(r.nome_referencia))}</b> — ${esc(telefoneParcial(r.telefone))}
        </li>`).join('')

    const html = `
      <p>Você contratou um serviço pelo Zelo. Conforme informado antes de
      confirmar, a profissional <b>${nomeProf}</b> tem
      ${referencias.length === 1 ? 'uma referência de trabalho confirmada' : `${referencias.length} referências de trabalho confirmadas`}
      pela nossa equipe:</p>
      <ul>${itens}
      </ul>
      <p>Por segurança e privacidade de quem fez a indicação, o Zelo não
      envia o nome completo nem o telefone completo.</p>
      <p><b>Para mais informações sobre essas referências, entre em contato
      direto com ${nomeProf}, que fez as indicações.</b></p>
    `

    let resultado = 'enviado'
    try {
      await enviarEmail(destino, 'Referências de trabalho — Zelo', html)
    } catch (e) {
      resultado = `falhou: ${e.message}`
    }

    // Log de divulgação: registra que ESTE cliente recebeu ESTA
    // referência, quando, e que aceitou o disclaimer — parte do dever de
    // prestar contas do tratamento de dado de terceiro (migração 27).
    await supabase.from('divulgacoes_referencia').insert(
      referencias.map((r) => ({
        referencia_id: r.id,
        booking_id: booking.id,
        cliente_id: clienteId,
        aceitou_disclaimer: true
      }))
    )

    return new Response(JSON.stringify({ ok: true, resultado }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ erro: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
