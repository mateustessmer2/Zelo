// ============================================================================
// EDGE FUNCTION — notificar-booking
// ----------------------------------------------------------------------------
// Dispara duas mensagens de WhatsApp quando um pedido é criado:
//   1. para a profissional  — "você tem um pedido novo"
//   2. para o admin (você)  — cópia, para acompanhar sem abrir o painel
//
// COMO É CHAMADA
// Por um Database Webhook do Supabase, configurado no painel:
//   Database → Webhooks → Create → tabela `bookings`, evento INSERT,
//   tipo "Supabase Edge Functions", função `notificar-booking`.
//
// POR QUE EDGE FUNCTION, E NÃO CHAMAR A META DIRETO DO APP
// O token da Meta não pode ficar no frontend — qualquer pessoa leria o
// código e passaria a enviar mensagens em nome do Zelo. Aqui ele vive como
// secret no servidor, e o navegador nunca o vê.
//
// SECRETS NECESSÁRIOS (Supabase → Edge Functions → Secrets)
//   WHATSAPP_TOKEN        token permanente da Meta
//   WHATSAPP_PHONE_ID     Phone Number ID (não é o telefone, é um id numérico)
//   ADMIN_WHATSAPP        seu número, formato 5553999999999
//   SUPABASE_URL          já existe por padrão
//   SUPABASE_SERVICE_ROLE_KEY  já existe por padrão
//
// TEMPLATES — precisam estar APROVADOS na Meta antes de funcionar.
// Os nomes esperados aqui são `pedido_novo_profissional` e `pedido_novo_admin`.
// O texto de cada um está no comentário de `montarMensagem` abaixo.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')
const ADMIN_WHATSAPP = Deno.env.get('ADMIN_WHATSAPP')

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/** Normaliza para o formato que a Meta espera: 55 + DDD + número, só dígitos. */
function normalizarTelefone(bruto: string | null): string | null {
  if (!bruto) return null
  const digitos = bruto.replace(/\D/g, '')
  if (digitos.length < 10) return null
  // Já tem código do país
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos
  return `55${digitos}`
}

const TURNOS: Record<string, string> = {
  manha: 'manhã',
  tarde: 'tarde',
  noite: 'noite',
  integral: 'turno integral (manhã+tarde)'
}

/**
 * Envia um template aprovado.
 *
 * Categoria "utilidade" (aviso transacional) — a mais barata, e a correta
 * para este caso. Marketing custaria ~10x e seria classificação errada.
 */
async function enviarTemplate(para: string, template: string, params: string[]) {
  const resp = await fetch(
    `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: para,
        type: 'template',
        template: {
          name: template,
          language: { code: 'pt_BR' },
          components: [
            {
              type: 'body',
              parameters: params.map((text) => ({ type: 'text', text }))
            }
          ]
        }
      })
    }
  )

  const corpo = await resp.json()
  if (!resp.ok) {
    throw new Error(`Meta ${resp.status}: ${JSON.stringify(corpo)}`)
  }
  return corpo
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const booking = payload.record ?? payload

    if (!booking?.id) {
      return new Response(JSON.stringify({ erro: 'sem booking' }), { status: 400 })
    }

    // Busca os dados com service role: o RLS não se aplica aqui, e é
    // proposital — a função precisa ler o telefone das duas partes.
    const [{ data: profissional }, { data: cliente }, { data: categoria }, { data: bairro }, { data: contato }] =
      await Promise.all([
        supabase.from('perfis').select('nome').eq('id', booking.profissional_id).maybeSingle(),
        supabase.from('perfis').select('nome').eq('id', booking.cliente_id).maybeSingle(),
        supabase.from('categorias').select('nome').eq('id', booking.categoria_id).maybeSingle(),
        booking.bairro_id
          ? supabase.from('bairros').select('nome').eq('id', booking.bairro_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('contatos').select('telefone, whatsapp').eq('perfil_id', booking.profissional_id).maybeSingle()
      ])

    const dataBR = new Date(`${booking.data_servico}T12:00:00`).toLocaleDateString('pt-BR')
    const turno = TURNOS[booking.turno] ?? booking.turno ?? '—'
    const nomeProf = profissional?.nome ?? 'profissional'
    const nomeCliente = cliente?.nome ?? 'um cliente'
    const servico = categoria?.nome ?? 'serviço'
    const local = bairro?.nome ?? 'Pelotas'

    const resultados: Record<string, string> = {}

    // ---- 1. Profissional -----------------------------------------------
    // Template `pedido_novo_profissional`, corpo esperado:
    // "Oi {{1}}! Você recebeu um pedido de {{2}} para {{3}} no dia {{4}},
    //  {{5}}, no bairro {{6}}. Abra o Zelo para aceitar ou recusar."
    const telProf = normalizarTelefone(contato?.whatsapp ?? contato?.telefone ?? null)
    if (telProf) {
      try {
        await enviarTemplate(telProf, 'pedido_novo_profissional', [
          nomeProf, nomeCliente, servico, dataBR, turno, local
        ])
        resultados.profissional = 'enviado'
      } catch (e) {
        resultados.profissional = `falhou: ${e.message}`
      }
    } else {
      resultados.profissional = 'sem telefone cadastrado'
    }

    // ---- 2. Admin --------------------------------------------------------
    // Template `pedido_novo_admin`, corpo esperado:
    // "Novo pedido no Zelo: {{1}} pediu {{2}} para {{3}} em {{4}}, {{5}}.
    //  Profissional: {{6}}."
    const telAdmin = normalizarTelefone(ADMIN_WHATSAPP ?? null)
    if (telAdmin) {
      try {
        await enviarTemplate(telAdmin, 'pedido_novo_admin', [
          nomeCliente, servico, dataBR, local, turno, nomeProf
        ])
        resultados.admin = 'enviado'
      } catch (e) {
        resultados.admin = `falhou: ${e.message}`
      }
    } else {
      resultados.admin = 'ADMIN_WHATSAPP não configurado'
    }

    // Registra o resultado. Sem isto, uma falha de envio some sem deixar
    // rastro — e você só descobriria pela profissional reclamando que
    // nunca foi avisada.
    await supabase.from('notificacoes_log').insert({
      booking_id: booking.id,
      canal: 'whatsapp',
      destino_profissional: resultados.profissional,
      destino_admin: resultados.admin
    })

    return new Response(JSON.stringify({ ok: true, resultados }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ erro: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
