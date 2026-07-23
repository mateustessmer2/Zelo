import { supabase } from './supabase'

// ============================================================================
// CAMADA DE DADOS
// ----------------------------------------------------------------------------
// Toda conversa com o banco passa por aqui. Componentes não chamam supabase
// diretamente — assim a regra de negócio fica em um lugar só.
//
// IMPORTANTE: a segurança NÃO está neste arquivo. Ela está nas policies RLS
// (02_rls.sql). Estas funções só pedem os dados; o Postgres decide o que
// devolver. Se alguém chamar a API por fora do app, as mesmas regras valem.
// ============================================================================

// ---------------------------------------------------------------- Geografia
export async function listarCidadesAtivas() {
  const { data, error } = await supabase
    .from('cidades')
    .select('id, nome, uf, slug')
    .eq('ativa', true)
    .order('nome')
  if (error) throw error
  return data
}

export async function listarBairros(cidadeId) {
  const { data, error } = await supabase
    .from('bairros')
    .select('id, nome')
    .eq('cidade_id', cidadeId)
    .order('nome')
  if (error) throw error
  return data
}

// --------------------------------------------------------------- Categorias
export async function listarCategoriasAtivas() {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nome, slug, icone')
    .eq('ativa', true)
    .order('ordem')
  if (error) throw error
  return data
}

// ------------------------------------------------------------ Profissionais
/**
 * Busca profissionais compatíveis com a necessidade do cliente.
 *
 * Não é preciso filtrar por `visivel` aqui: a policy `prof_select_visiveis`
 * já esconde quem não passou pela verificação de identidade + antecedentes.
 * Deixamos o filtro explícito mesmo assim, por clareza de intenção.
 */
export async function buscarProfissionais({ categoriaId, bairroId, limite = 6 }) {
  let query = supabase
    .from('profissionais')
    .select(`
      id,
      descricao,
      idade,
      valor_hora,
      valor_diaria,
      tempo_resposta_min,
      visivel,
      perfis!inner ( nome, foto_url ),
      profissional_categorias!inner ( categoria_id ),
      profissional_bairros!inner ( bairro_id, bairros ( nome ) )
    `)
    .eq('visivel', true)
    .limit(limite)

  if (categoriaId) query = query.eq('profissional_categorias.categoria_id', categoriaId)
  if (bairroId) query = query.eq('profissional_bairros.bairro_id', bairroId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function obterProfissional(id) {
  const { data, error } = await supabase
    .from('profissionais')
    .select(`
      *,
      perfis ( nome, foto_url, cidade_id, bairro_id ),
      profissional_categorias ( categorias ( nome, icone ) ),
      profissional_bairros ( bairros ( nome ) )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ------------------------------------------------------------- Trust scores
/**
 * Indicadores agregados. É o ÚNICO caminho pelo qual alguém enxerga a
 * reputação que recebeu — nunca os comentários individuais.
 *
 * lado: 'cliente_avalia_prof' (reputação da profissional)
 *       'prof_avalia_cliente' (reputação do cliente)
 */
export async function obterTrustScore(perfilId, lado) {
  const { data, error } = await supabase
    .from('trust_scores')
    .select('nota_media, total_avaliacoes')
    .eq('alvo_id', perfilId)
    .eq('lado', lado)
    .maybeSingle()
  if (error) throw error
  return data ?? { nota_media: null, total_avaliacoes: 0 }
}

// ---------------------------------------------------------------- Avaliações
/**
 * Lista avaliações de um lado específico.
 *
 * A policy `avaliacoes_select_segmentado` faz o trabalho pesado: um cliente
 * logado só recebe linhas de 'cliente_avalia_prof'; uma profissional só
 * recebe 'prof_avalia_cliente'. Pedir o lado errado devolve lista vazia —
 * o banco simplesmente não entrega.
 *
 * Note que NÃO selecionamos autor_id: os comentários são anônimos na UI.
 */
export async function listarAvaliacoes(alvoId, lado) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('id, nota, comentario, created_at')
    .eq('alvo_id', alvoId)
    .eq('lado', lado)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}

/**
 * Cria uma avaliação. A policy de INSERT exige booking concluído e
 * participação real — não dá pra avaliar quem você não contratou.
 */
export async function criarAvaliacao({ bookingId, autorId, alvoId, lado, nota, comentario }) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .insert({
      booking_id: bookingId,
      autor_id: autorId,
      alvo_id: alvoId,
      lado,
      nota,
      comentario
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ------------------------------------------------------------------ Bookings
export async function criarBooking({
  clienteId, profissionalId, categoriaId, bairroId,
  dataServico, turno, observacao, valorCombinado
}) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      cliente_id: clienteId,
      profissional_id: profissionalId,
      categoria_id: categoriaId,
      bairro_id: bairroId,
      data_servico: dataServico,
      turno,
      observacao,
      valor_combinado: valorCombinado,
      status: 'solicitado'
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listarBookingsCliente(clienteId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      categorias ( nome, icone ),
      bairros ( nome ),
      profissionais ( id, valor_hora, perfis ( nome, foto_url ) )
    `)
    .eq('cliente_id', clienteId)
    .order('data_servico', { ascending: false })
  if (error) throw error
  return data
}

export async function listarBookingsProfissional(profissionalId) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      categorias ( nome, icone ),
      bairros ( nome ),
      perfis!bookings_cliente_id_fkey ( id, nome, foto_url )
    `)
    .eq('profissional_id', profissionalId)
    .order('data_servico', { ascending: false })
  if (error) throw error
  return data
}

export async function atualizarStatusBooking(bookingId, status) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ------------------------------------------------------------------ Mensagens
export async function listarMensagens(bookingId) {
  const { data, error } = await supabase
    .from('mensagens')
    .select('id, autor_id, conteudo, created_at')
    .eq('booking_id', bookingId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function enviarMensagem({ bookingId, autorId, conteudo }) {
  const { data, error } = await supabase
    .from('mensagens')
    .insert({ booking_id: bookingId, autor_id: autorId, conteudo })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Chat ao vivo via Supabase Realtime. Devolve a função de cleanup. */
export function inscreverMensagens(bookingId, onNova) {
  const canal = supabase
    .channel(`mensagens:${bookingId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `booking_id=eq.${bookingId}` },
      (payload) => onNova(payload.new)
    )
    .subscribe()
  return () => supabase.removeChannel(canal)
}

// ------------------------------------------------------------------ Contato
/**
 * Telefone e WhatsApp vivem em `contatos`, não em `perfis`.
 *
 * A policy `contatos_select_booking_confirmado` só entrega o contato da outra
 * parte quando existe booking confirmado ou concluído entre as duas. A regra
 * está no Postgres — não dá para contornar chamando a API por fora.
 *
 * Retorna null quando ainda não há liberação: o banco simplesmente não
 * devolve a linha.
 */
export async function obterContato(outraParteId) {
  const { data, error } = await supabase
    .from('contatos')
    .select('telefone, whatsapp')
    .eq('perfil_id', outraParteId)
    .maybeSingle()
  if (error) throw error
  return data // null quando ainda não há booking confirmado — o banco recusa
}

/** Cada pessoa grava o próprio contato. */
export async function salvarContato(perfilId, { telefone, whatsapp }) {
  const { error } = await supabase
    .from('contatos')
    .upsert({ perfil_id: perfilId, telefone, whatsapp, updated_at: new Date().toISOString() })
  if (error) throw error
}

// -------------------------------------------------------------- Verificação
export async function listarVerificacoes(profissionalId) {
  const { data, error } = await supabase
    .from('verificacoes')
    .select('id, tipo, status, metodo, verificado_em, observacao')
    .eq('profissional_id', profissionalId)
  if (error) throw error
  return data
}

/**
 * Upload de documento sensível para o bucket PRIVADO.
 * O caminho começa com o id da profissional — é o que a policy de storage
 * confere. Nenhum cliente tem acesso a este bucket.
 */
export async function enviarDocumento({ profissionalId, tipo, arquivo }) {
  const ext = arquivo.name.split('.').pop()
  const path = `${profissionalId}/${tipo}-${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('documentos-verificacao')
    .upload(path, arquivo, { upsert: false })
  if (upErr) throw upErr

  const { data, error } = await supabase
    .from('verificacoes')
    .insert({
      profissional_id: profissionalId,
      tipo,
      status: 'em_analise',
      metodo: 'manual',
      documento_path: path
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ------------------------------------------------------------------ Admin
export async function listarFilaVerificacao() {
  const { data, error } = await supabase
    .from('verificacoes')
    .select(`
      id, tipo, status, documento_path, created_at,
      profissionais ( id, perfis ( nome ) )
    `)
    .in('status', ['pendente', 'em_analise'])
    .order('created_at')
  if (error) throw error
  return data
}

/**
 * Abre um documento sensível por URL assinada de curta duração.
 * Nunca use getPublicUrl() neste bucket.
 */
export async function urlAssinadaDocumento(path, segundos = 60) {
  const { data, error } = await supabase.storage
    .from('documentos-verificacao')
    .createSignedUrl(path, segundos)
  if (error) throw error
  return data.signedUrl
}

/**
 * Aprova/rejeita uma verificação e sincroniza o status na profissional.
 * Quando identidade E antecedentes ficam 'aprovado', a coluna gerada
 * `visivel` vira true sozinha e o perfil entra na busca. Ninguém "publica"
 * manualmente — a regra está no banco.
 */
export async function decidirVerificacao({ verificacaoId, profissionalId, tipo, status, adminId, observacao }) {
  const { error: e1 } = await supabase
    .from('verificacoes')
    .update({
      status,
      verificado_por: adminId,
      verificado_em: new Date().toISOString(),
      observacao
    })
    .eq('id', verificacaoId)
  if (e1) throw e1

  const coluna = tipo === 'identidade' ? 'identidade_status' : 'antecedentes_status'
  const { error: e2 } = await supabase
    .from('profissionais')
    .update({ [coluna]: status, updated_at: new Date().toISOString() })
    .eq('id', profissionalId)
  if (e2) throw e2
}

// ------------------------------------------------------------------ Favoritos
export async function listarFavoritos(clienteId) {
  const { data, error } = await supabase
    .from('favoritos')
    .select('profissional_id, profissionais ( id, valor_hora, perfis ( nome ) )')
    .eq('cliente_id', clienteId)
  if (error) throw error
  return data
}

export async function alternarFavorito(clienteId, profissionalId, favoritado) {
  if (favoritado) {
    const { error } = await supabase
      .from('favoritos')
      .delete()
      .match({ cliente_id: clienteId, profissional_id: profissionalId })
    if (error) throw error
    return false
  }
  const { error } = await supabase
    .from('favoritos')
    .insert({ cliente_id: clienteId, profissional_id: profissionalId })
  if (error) throw error
  return true
}

// --------------------------------------------------- Edição do perfil profissional
export async function atualizarPerfil(perfilId, campos) {
  const { error } = await supabase
    .from('perfis')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', perfilId)
  if (error) throw error
}

export async function atualizarProfissional(profissionalId, campos) {
  const { error } = await supabase
    .from('profissionais')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', profissionalId)
  if (error) throw error
}

/** Substitui o conjunto de categorias da profissional (N:N). */
export async function definirCategorias(profissionalId, categoriaIds) {
  const { error: delErr } = await supabase
    .from('profissional_categorias')
    .delete()
    .eq('profissional_id', profissionalId)
  if (delErr) throw delErr

  if (!categoriaIds.length) return
  const { error } = await supabase
    .from('profissional_categorias')
    .insert(categoriaIds.map((categoria_id) => ({ profissional_id: profissionalId, categoria_id })))
  if (error) throw error
}

/** Substitui o conjunto de bairros atendidos (N:N). */
export async function definirBairros(profissionalId, bairroIds) {
  const { error: delErr } = await supabase
    .from('profissional_bairros')
    .delete()
    .eq('profissional_id', profissionalId)
  if (delErr) throw delErr

  if (!bairroIds.length) return
  const { error } = await supabase
    .from('profissional_bairros')
    .insert(bairroIds.map((bairro_id) => ({ profissional_id: profissionalId, bairro_id })))
  if (error) throw error
}

export async function obterCategoriasBairros(profissionalId) {
  const [{ data: cats }, { data: bairs }] = await Promise.all([
    supabase.from('profissional_categorias').select('categoria_id').eq('profissional_id', profissionalId),
    supabase.from('profissional_bairros').select('bairro_id').eq('profissional_id', profissionalId)
  ])
  return {
    categoriaIds: (cats ?? []).map((c) => c.categoria_id),
    bairroIds: (bairs ?? []).map((b) => b.bairro_id)
  }
}

// ------------------------------------------------------------------- Agenda
/**
 * Disponibilidade é DECLARAÇÃO, não compromisso.
 *
 * Deliberadamente não existe penalidade por indisponibilidade nem métrica de
 * taxa de aceitação: qualquer mecanismo que pressione a profissional a aceitar
 * constrói subordinação — que é o que caracteriza vínculo empregatício.
 */
export async function listarDisponibilidade(profissionalId) {
  const { data, error } = await supabase
    .from('disponibilidade')
    .select('id, dia_semana, turno')
    .eq('profissional_id', profissionalId)
  if (error) throw error
  return data
}

export async function definirDisponibilidade(profissionalId, slots) {
  const { error: delErr } = await supabase
    .from('disponibilidade')
    .delete()
    .eq('profissional_id', profissionalId)
  if (delErr) throw delErr

  if (!slots.length) return
  const { error } = await supabase
    .from('disponibilidade')
    .insert(slots.map((s) => ({ profissional_id: profissionalId, dia_semana: s.dia, turno: s.turno })))
  if (error) throw error
}

export async function listarBloqueios(profissionalId) {
  const { data, error } = await supabase
    .from('dias_bloqueados')
    .select('id, data, motivo')
    .eq('profissional_id', profissionalId)
    .gte('data', new Date().toISOString().slice(0, 10))
    .order('data')
  if (error) throw error
  return data
}

export async function adicionarBloqueio(profissionalId, data, motivo) {
  const { error } = await supabase
    .from('dias_bloqueados')
    .insert({ profissional_id: profissionalId, data, motivo })
  if (error) throw error
}

export async function removerBloqueio(id) {
  const { error } = await supabase.from('dias_bloqueados').delete().eq('id', id)
  if (error) throw error
}
