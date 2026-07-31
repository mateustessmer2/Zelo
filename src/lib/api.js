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
 * já esconde quem não passou pela verificação de identidade + selfie
 * (antecedentes está temporariamente fora do gate — ver migração 16).
 * Deixamos o filtro explícito mesmo assim, por clareza de intenção.
 */
/**
 * Compatibilidade entre o turno pedido e o declarado na agenda.
 *
 * Quem atende 'integral' (manhã + tarde) aparece também em buscas por
 * 'manha' ou 'tarde' — quem atende o turno integral obviamente pode
 * pegar meio período. O contrário não vale: quem só atende de manhã não
 * serve para quem precisa do dia inteiro.
 *
 * Resolver isto aqui, e não duplicando linhas em `disponibilidade`, mantém
 * a agenda legível: a profissional marcou "integral", e é isso que ela vê.
 */
function turnosCompativeis(turnoPedido) {
  if (!turnoPedido) return null
  if (turnoPedido === 'integral') return ['integral']
  if (turnoPedido === 'manha' || turnoPedido === 'tarde') return [turnoPedido, 'integral']
  return [turnoPedido]
}

export async function buscarProfissionais({ categoriaId, bairroId, turno, limite = 6 }) {
  // Cada etapa identifica a si mesma no erro. Sem isso, qualquer falha aqui
  // virava um "não foi possível buscar" genérico, e descobrir a causa exigia
  // console do navegador — que nem sempre está à mão.
  const etapa = async (nome, fn) => {
    const { data, error } = await fn()
    if (error) throw new Error(`[${nome}] ${error.message ?? error.code ?? 'erro desconhecido'}`)
    return data ?? []
  }

  let ids = null

  if (categoriaId) {
    const rows = await etapa('categorias', () =>
      supabase.from('profissional_categorias').select('profissional_id').eq('categoria_id', categoriaId)
    )
    ids = rows.map((r) => r.profissional_id)
    if (!ids.length) return []
  }

  if (bairroId) {
    // Quem marcou "atende todos os bairros" entra na busca por QUALQUER
    // bairro, mesmo sem linha em profissional_bairros.
    const doBairroRows = await etapa('bairros', () =>
      supabase.from('profissional_bairros').select('profissional_id').eq('bairro_id', bairroId)
    )
    const todosRows = await etapa('atende-todos', () =>
      supabase.from('profissionais').select('id').eq('atende_todos_bairros', true)
    )
    const doBairro = new Set([
      ...doBairroRows.map((r) => r.profissional_id),
      ...todosRows.map((r) => r.id)
    ])
    ids = ids ? ids.filter((id) => doBairro.has(id)) : [...doBairro]
    if (!ids.length) return []
  }

  // Filtro por turno: só restringe quem já declarou agenda. Profissional
  // sem disponibilidade cadastrada continua aparecendo — no começo quase
  // ninguém preenche agenda, e escondê-las esvaziaria a busca.
  const compativeis = turnosCompativeis(turno)
  if (compativeis) {
    const disp = await etapa('disponibilidade', () =>
      supabase.from('disponibilidade').select('profissional_id, turno')
    )

    const comAgenda = new Set(disp.map((d) => d.profissional_id))
    const atendem = new Set(
      disp.filter((d) => compativeis.includes(d.turno)).map((d) => d.profissional_id)
    )
    const passa = (id) => !comAgenda.has(id) || atendem.has(id)

    if (ids) {
      ids = ids.filter(passa)
    } else {
      const incompativeis = [...comAgenda].filter((id) => !atendem.has(id))
      if (incompativeis.length) {
        const todos = await etapa('visiveis', () =>
          supabase.from('profissionais').select('id').eq('visivel', true)
        )
        ids = todos.map((p) => p.id).filter((id) => !incompativeis.includes(id))
      }
    }
    if (ids && !ids.length) return []
  }

  // `.in('id', [])` gera uma URL que o PostgREST rejeita com 400. Um array
  // vazio aqui significa "nenhum candidato", então saímos antes.
  if (Array.isArray(ids) && ids.length === 0) return []

  let query = supabase
    .from('profissionais')
    .select('id, descricao, idade, valor_meio_turno, valor_diaria, valor_km, tempo_resposta_min, visivel, atende_todos_bairros, selo, pontuacao_perfil')
    .eq('visivel', true)
    // Perfil mais completo aparece primeiro — decisão de negócio para
    // incentivar preenchimento (foto, descrição, valores, agenda,
    // referência aprovada). Empate desfeito por tempo de resposta: entre
    // dois perfis igualmente completos, quem responde mais rápido sobe.
    .order('pontuacao_perfil', { ascending: false })
    .order('tempo_resposta_min', { ascending: true, nullsFirst: false })
    .limit(limite)

  if (ids) query = query.in('id', ids)

  const profs = await etapa('perfis-visiveis', () => query)
  if (!profs.length) return []

  const profIds = profs.map((p) => p.id)
  const perfisRows = await etapa('nomes', () =>
    supabase.from('perfis').select('id, nome, foto_url').in('id', profIds)
  )
  const vinculos = await etapa('vinculos-bairro', () =>
    supabase.from('profissional_bairros').select('profissional_id, bairro_id').in('profissional_id', profIds)
  )

  const bairroIds = [...new Set(vinculos.map((v) => v.bairro_id))]
  const bairrosRows = bairroIds.length
    ? await etapa('nomes-bairro', () =>
        supabase.from('bairros').select('id, nome').in('id', bairroIds)
      )
    : []

  const nomePorId = Object.fromEntries(perfisRows.map((p) => [p.id, p]))
  const bairroPorId = Object.fromEntries(bairrosRows.map((b) => [b.id, b]))

  return profs.map((p) => ({
    ...p,
    perfis: nomePorId[p.id] ?? null,
    profissional_bairros: p.atende_todos_bairros
      ? []
      : vinculos
          .filter((v) => v.profissional_id === p.id)
          .map((v) => ({ bairros: bairroPorId[v.bairro_id] ?? null }))
  }))
}


// ------------------------------------------------------------- Trust scores
/**
 * Indicadores agregados. É o ÚNICO caminho pelo qual alguém enxerga a
 * reputação que recebeu — nunca os comentários individuais.
 *
 * lado: 'cliente_avalia_prof' (reputação da profissional)
 *       'prof_avalia_cliente' (reputação do cliente)
 */
/**
 * Perfil completo da profissional.
 *
 * Consultas separadas em vez de um select aninhado: os joins duplos via
 * tabela de junção com chave composta (profissional_categorias -> categorias)
 * são frágeis no PostgREST e falhavam silenciosamente. Três queries simples
 * são mais previsíveis — e cada uma pode falhar sem derrubar as outras.
 */
export async function obterProfissional(id) {
  const { data: prof, error } = await supabase
    .from('profissionais')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!prof) return null

  const [{ data: perfilRow }, { data: cats }, { data: bairs }, { data: servs }] = await Promise.all([
    supabase.from('perfis').select('nome, foto_url, cidade_id, bairro_id').eq('id', id).maybeSingle(),
    supabase.from('profissional_categorias').select('categoria_id').eq('profissional_id', id),
    supabase.from('profissional_bairros').select('bairro_id').eq('profissional_id', id),
    supabase.from('profissional_servicos').select('servico_id').eq('profissional_id', id)
  ])

  const categoriaIds = (cats ?? []).map((c) => c.categoria_id)
  const bairroIds = (bairs ?? []).map((b) => b.bairro_id)
  const servicoIds = (servs ?? []).map((s) => s.servico_id)

  const [{ data: categoriasNomes }, { data: bairrosNomes }, { data: servicosNomes }] = await Promise.all([
    categoriaIds.length
      ? supabase.from('categorias').select('id, nome, icone').in('id', categoriaIds)
      : Promise.resolve({ data: [] }),
    bairroIds.length
      ? supabase.from('bairros').select('id, nome').in('id', bairroIds)
      : Promise.resolve({ data: [] }),
    servicoIds.length
      ? supabase.from('servicos_disponiveis').select('id, nome').in('id', servicoIds)
      : Promise.resolve({ data: [] })
  ])

  return {
    ...prof,
    perfis: perfilRow ?? null,
    categorias: categoriasNomes ?? [],
    bairros: bairrosNomes ?? [],
    servicos: servicosNomes ?? [],
    profissional_categorias: (categoriasNomes ?? []).map((c) => ({ categorias: c })),
    profissional_bairros: (bairrosNomes ?? []).map((b) => ({ bairros: b }))
  }
}

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
/**
 * Ids dos bookings que EU já avaliei.
 *
 * Serve para o app não oferecer "Avaliar" duas vezes: não existe policy de
 * UPDATE em `avaliacoes` — avaliação enviada não se edita, e é assim que
 * deve ser numa reputação confiável. Sem esta checagem, a pessoa clicaria,
 * escreveria e receberia um erro genérico.
 *
 * A policy `avaliacoes_select_segmentado` sempre entrega ao autor o que ele
 * mesmo escreveu, então esta consulta funciona antes da publicação.
 */
export async function listarBookingsAvaliadosPorMim(autorId) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('booking_id')
    .eq('autor_id', autorId)
  if (error) throw error
  return new Set((data ?? []).map((a) => a.booking_id))
}

export async function criarAvaliacao({ bookingId, autorId, alvoId, lado, nota, comentario, comentarioPrivado }) {
  const { data, error } = await supabase
    .from('avaliacoes')
    .insert({
      booking_id: bookingId,
      autor_id: autorId,
      alvo_id: alvoId,
      lado,
      nota,
      comentario,
      comentario_privado: comentarioPrivado || null
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Mensagens privadas que EU recebi.
 *
 * Lê a view `minhas_avaliacoes_recebidas`, que já filtra por alvo_id e só
 * entrega o que passou pela liberação simultânea. Não expõe autor nem o
 * comentário público — a pessoa lê a mensagem sem descobrir quem escreveu
 * a avaliação pública.
 */
export async function listarFeedbackPrivado() {
  const { data, error } = await supabase
    .from('minhas_avaliacoes_recebidas')
    .select('id, booking_id, lado, nota, comentario_privado, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}


/** Rótulo legível do turno. 'integral' precisa virar texto, não código. */
export function rotuloTurno(turno) {
  return { manha: 'manhã', tarde: 'tarde', noite: 'noite', integral: 'turno integral (manhã+tarde)' }[turno] ?? turno ?? ''
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
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('data_servico', { ascending: false })
  if (error) throw error
  if (!bookings?.length) return []

  return enriquecerBookings(bookings, 'profissional')
}

/**
 * Preenche categoria, bairro e a outra parte de cada booking.
 * Consultas separadas em vez de selects aninhados — mais previsível.
 */
async function enriquecerBookings(bookings, outraParte) {
  const catIds = [...new Set(bookings.map((b) => b.categoria_id).filter(Boolean))]
  const bairroIds = [...new Set(bookings.map((b) => b.bairro_id).filter(Boolean))]
  const pessoaIds = [...new Set(
    bookings.map((b) => outraParte === 'profissional' ? b.profissional_id : b.cliente_id).filter(Boolean)
  )]

  const [{ data: cats }, { data: bairs }, { data: pessoas }, { data: profs }] = await Promise.all([
    catIds.length ? supabase.from('categorias').select('id, nome, icone').in('id', catIds) : Promise.resolve({ data: [] }),
    bairroIds.length ? supabase.from('bairros').select('id, nome').in('id', bairroIds) : Promise.resolve({ data: [] }),
    pessoaIds.length ? supabase.from('perfis').select('id, nome, foto_url').in('id', pessoaIds) : Promise.resolve({ data: [] }),
    outraParte === 'profissional' && pessoaIds.length
      ? supabase.from('profissionais').select('id, valor_meio_turno').in('id', pessoaIds)
      : Promise.resolve({ data: [] })
  ])

  const catPorId = Object.fromEntries((cats ?? []).map((c) => [c.id, c]))
  const bairroPorId = Object.fromEntries((bairs ?? []).map((b) => [b.id, b]))
  const pessoaPorId = Object.fromEntries((pessoas ?? []).map((p) => [p.id, p]))
  const profPorId = Object.fromEntries((profs ?? []).map((p) => [p.id, p]))

  return bookings.map((b) => {
    const outroId = outraParte === 'profissional' ? b.profissional_id : b.cliente_id
    return {
      ...b,
      categorias: catPorId[b.categoria_id] ?? null,
      bairros: bairroPorId[b.bairro_id] ?? null,
      perfis: pessoaPorId[outroId] ?? null,
      profissionais: outraParte === 'profissional'
        ? { ...(profPorId[outroId] ?? {}), id: outroId, perfis: pessoaPorId[outroId] ?? null }
        : null
    }
  })
}

export async function listarBookingsProfissional(profissionalId) {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('profissional_id', profissionalId)
    .order('data_servico', { ascending: false })
  if (error) throw error
  if (!bookings?.length) return []

  return enriquecerBookings(bookings, 'cliente')
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

/**
 * WhatsApp da profissional, só para o cliente que ACABOU de criar um pedido
 * com ela — usado para abrir o wa.me na hora do clique em "Contratar",
 * antes de qualquer aceite.
 *
 * Não usa `obterContato` porque aquela função depende da policy
 * `contatos_select_booking_confirmado`, que só libera após o booking virar
 * 'confirmado' — aqui o requisito é o oposto: liberar assim que o pedido
 * é criado (status 'solicitado'), decisão tomada explicitamente para dar
 * agilidade ao primeiro contato. `bookingId` prova que o pedido acabou de
 * ser criado por quem está chamando esta função.
 */
export async function obterWhatsappParaContratacao(bookingId) {
  const { data: booking, error: e1 } = await supabase
    .from('bookings')
    .select('profissional_id, cliente_id')
    .eq('id', bookingId)
    .maybeSingle()
  if (e1) throw e1
  if (!booking) return null

  const { data: contato, error: e2 } = await supabase
    .from('contatos')
    .select('whatsapp, telefone')
    .eq('perfil_id', booking.profissional_id)
    .maybeSingle()
  if (e2) throw e2

  return contato?.whatsapp || contato?.telefone || null
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

/** Rótulo legível de cada selo, usado no perfil e nos cartões de busca. */
export function rotuloSelo(selo) {
  return { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' }[selo] ?? null
}

/**
 * Referências de trabalho da própria profissional (para ela ver o status).
 * Nome e telefone da referência só aparecem aqui e na fila do admin —
 * nunca no perfil público nem para o cliente. O selo é o único reflexo
 * disso que qualquer outra pessoa enxerga.
 */
/**
 * Só a CONTAGEM de referências aprovadas de uma profissional — nunca o
 * conteúdo (nome/telefone). Usada para decidir se mostra o disclaimer
 * antes de contratar, sem revelar o contato em si: o dado só é entregue
 * por e-mail, depois que o cliente aceita o disclaimer e contrata.
 */
/**
 * Dispara o envio do contato de referência (primeiro nome + telefone) por
 * e-mail ao cliente que acabou de contratar — só depois do disclaimer
 * aceito. A Edge Function (`enviar-referencia`) é quem decide o conteúdo
 * real: o frontend nunca lê nome/telefone da referência em si, só pede
 * o envio e registra que o disclaimer foi aceito.
 */
export async function solicitarEnvioReferencia({ bookingId, versaoDisclaimer }) {
  const { error } = await supabase.functions.invoke('enviar-referencia', {
    body: { bookingId, versaoDisclaimer }
  })
  if (error) throw error
}

export async function contarReferenciasAprovadas(profissionalId) {
  const { data, error } = await supabase.rpc('contar_referencias_aprovadas', {
    p_profissional_id: profissionalId
  })
  if (error) throw error
  return data ?? 0
}

export async function listarReferencias(profissionalId) {
  const { data, error } = await supabase
    .from('referencias_trabalho')
    .select('id, nome_referencia, telefone, status, observacao, created_at')
    .eq('profissional_id', profissionalId)
    .order('created_at')
  if (error) throw error
  return data
}

/**
 * Envia uma nova referência. O limite de 3 é imposto pelo trigger
 * `checar_limite_referencias` no banco — não confie só na contagem feita
 * aqui, ela existe para dar uma mensagem mais amigável antes de tentar.
 */
export async function enviarReferencia({ profissionalId, nome, telefone }) {
  const { error } = await supabase
    .from('referencias_trabalho')
    .insert({ profissional_id: profissionalId, nome_referencia: nome, telefone })
  if (error) throw error
}

/**
 * Fila de referências pendentes, para o admin aprovar por telefone.
 * O admin liga para o contato informado e confirma que o trabalho
 * aconteceu de fato — só então aprova.
 */
export async function listarFilaReferencias() {
  const { data: refs, error } = await supabase
    .from('referencias_trabalho')
    .select('id, profissional_id, nome_referencia, telefone, status, created_at')
    .eq('status', 'pendente')
    .order('created_at')
  if (error) throw error
  if (!refs?.length) return []

  const ids = [...new Set(refs.map((r) => r.profissional_id))]
  const { data: perfis } = await supabase.from('perfis').select('id, nome').in('id', ids)
  const nomePorId = Object.fromEntries((perfis ?? []).map((p) => [p.id, p.nome]))

  return refs.map((r) => ({ ...r, profissional_nome: nomePorId[r.profissional_id] ?? '—' }))
}

/**
 * Aprova ou rejeita uma referência. O trigger `trg_referencia_muda_selo`
 * recalcula o selo sozinho no banco — este código não precisa (e não
 * deve) tentar calcular bronze/prata/ouro aqui: contar linhas certas
 * depende de enxergar TODAS as referências da profissional, e o admin só
 * tem a fila de pendentes na tela.
 */
export async function decidirReferencia({ referenciaId, status, adminId, observacao }) {
  const { error } = await supabase
    .from('referencias_trabalho')
    .update({
      status,
      verificado_por: adminId,
      verificado_em: new Date().toISOString(),
      observacao
    })
    .eq('id', referenciaId)
  if (error) throw error
}

/**
 * Referências já aprovadas — é aqui que o admin encontra o que bloquear.
 * Diferente da fila de pendentes: esta lista é sobre decisão já tomada,
 * potencialmente precisando ser revertida por reclamação da pessoa citada.
 */
export async function listarReferenciasAprovadas() {
  const { data: refs, error } = await supabase
    .from('referencias_trabalho')
    .select('id, profissional_id, nome_referencia, telefone, bloqueada, bloqueada_em, bloqueada_motivo, verificado_em')
    .eq('status', 'aprovado')
    .order('verificado_em', { ascending: false })
  if (error) throw error
  if (!refs?.length) return []

  const ids = [...new Set(refs.map((r) => r.profissional_id))]
  const { data: perfis } = await supabase.from('perfis').select('id, nome').in('id', ids)
  const nomePorId = Object.fromEntries((perfis ?? []).map((p) => [p.id, p.nome]))

  return refs.map((r) => ({ ...r, profissional_nome: nomePorId[r.profissional_id] ?? '—' }))
}

/**
 * Bloqueia ou desbloqueia uma referência já aprovada — para quando a
 * pessoa citada como referência reclama de ter o contato dela usado sem
 * autorização, ou pede para não ser mais indicada.
 *
 * Bloquear NÃO apaga a referência (ela continua existindo como registro
 * de que foi aprovada uma vez), só para de ser divulgada e de contar
 * para o selo — o trigger `trg_referencia_muda_selo` (migração 27)
 * recalcula sozinho quando `bloqueada` muda.
 */
export async function bloquearReferencia({ referenciaId, bloqueada, motivo }) {
  const { error } = await supabase
    .from('referencias_trabalho')
    .update({
      bloqueada,
      bloqueada_em: bloqueada ? new Date().toISOString() : null,
      bloqueada_motivo: bloqueada ? motivo : null
    })
    .eq('id', referenciaId)
  if (error) throw error
}


/**
 * Upload de documento sensível para o bucket PRIVADO.
 * O caminho começa com o id da profissional — é o que a policy de storage
 * confere. Nenhum cliente tem acesso a este bucket.
 */
export async function enviarDocumento({ profissionalId, tipo, arquivo }) {
  // Sanitiza a extensão: o nome do arquivo vem do usuário e não é confiável.
  // "documento.pdf" -> "pdf"; nomes sem ponto ou com extensão estranha caem
  // no genérico "bin". O caminho continua preso à pasta do próprio uid — a
  // policy de storage confere a primeira pasta, não o nome do arquivo.
  const bruta = (arquivo.name.includes('.') ? arquivo.name.split('.').pop() : '').toLowerCase()
  const ext = /^[a-z0-9]{1,5}$/.test(bruta) ? bruta : 'bin'
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

/**
 * Foto de perfil — bucket PÚBLICO (`fotos-perfil`), diferente do bucket
 * de documentos de verificação. Faz sentido: o cliente vê essa foto na
 * busca; ela não é dado sensível como identidade ou selfie.
 *
 * `upsert: true` porque a profissional deve poder trocar a foto quantas
 * vezes quiser — diferente de documento de verificação, que não se edita
 * depois de enviado.
 */
export async function enviarFotoPerfil({ perfilId, arquivo }) {
  const bruta = (arquivo.name.includes('.') ? arquivo.name.split('.').pop() : '').toLowerCase()
  const ext = /^[a-z0-9]{1,5}$/.test(bruta) ? bruta : 'jpg'
  const path = `${perfilId}/foto.${ext}`

  const { error: upErr } = await supabase.storage
    .from('fotos-perfil')
    .upload(path, arquivo, { upsert: true })
  if (upErr) throw upErr

  const { data: pub } = supabase.storage.from('fotos-perfil').getPublicUrl(path)
  // Cache-busting: sem isto, o navegador continuaria mostrando a foto
  // antiga em cache mesmo depois da troca, porque o nome do arquivo
  // (com upsert) não muda.
  const url = `${pub.publicUrl}?t=${Date.now()}`

  const { error } = await supabase
    .from('perfis')
    .update({ foto_url: url, updated_at: new Date().toISOString() })
    .eq('id', perfilId)
  if (error) throw error

  return url
}

// ------------------------------------------------------------------ Admin
export async function listarFilaVerificacao() {
  const { data: verifs, error } = await supabase
    .from('verificacoes')
    .select('id, tipo, status, documento_path, created_at, profissional_id')
    .in('status', ['pendente', 'em_analise'])
    .order('created_at')
  if (error) throw error
  if (!verifs?.length) return []

  // Nomes num segundo passo: o aninhamento duplo
  // (verificacoes -> profissionais -> perfis) falha no PostgREST.
  const ids = [...new Set(verifs.map((v) => v.profissional_id))]
  const { data: perfisRows } = await supabase
    .from('perfis')
    .select('id, nome')
    .in('id', ids)

  const nomePorId = Object.fromEntries((perfisRows ?? []).map((p) => [p.id, p]))

  return verifs.map((v) => ({
    ...v,
    // Mantém o formato que o componente já consome
    profissionais: { id: v.profissional_id, perfis: nomePorId[v.profissional_id] ?? null }
  }))
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
/** Coluna de status em `profissionais` correspondente a cada tipo de verificação. */
const COLUNA_STATUS = {
  identidade: 'identidade_status',
  antecedentes: 'antecedentes_status',
  selfie: 'selfie_status'
}

/** Rótulo legível de cada tipo, usado na fila do admin e nos painéis. */
export function rotuloVerificacao(tipo) {
  return {
    identidade: 'Documento de identidade',
    antecedentes: 'Certidão de antecedentes',
    selfie: 'Selfie (confere com o documento)'
  }[tipo] ?? tipo
}

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

  // O trigger `sincronizar_status_verificacao` (migração 09/10) já espelha
  // o status em `profissionais`. Este update é redundância defensiva — e,
  // sem a coluna certa no mapa acima, gravaria no campo errado: antes ele
  // era um ternário que mandava QUALQUER tipo diferente de 'identidade'
  // para `antecedentes_status`, o que faria a selfie aprovar antecedentes.
  const coluna = COLUNA_STATUS[tipo]
  if (!coluna) return

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
    .select('profissional_id, profissionais ( id, valor_meio_turno, perfis ( nome ) )')
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

/**
 * Serviços específicos disponíveis dentro de uma categoria — ex.: dentro
 * de "Limpeza Residencial", a lista de "Limpeza geral", "Lavar roupas"
 * etc. Lista fixa (não texto livre), para permitir filtrar por serviço
 * específico no futuro sem depender de como cada profissional escreveu.
 */
export async function listarServicosDisponiveis(categoriaId) {
  const { data, error } = await supabase
    .from('servicos_disponiveis')
    .select('id, nome, ordem')
    .eq('categoria_id', categoriaId)
    .order('ordem')
  if (error) throw error
  return data
}

/** Quais serviços específicos a profissional já marcou. */
export async function obterServicosSelecionados(profissionalId) {
  const { data, error } = await supabase
    .from('profissional_servicos')
    .select('servico_id')
    .eq('profissional_id', profissionalId)
  if (error) throw error
  return (data ?? []).map((r) => r.servico_id)
}

/** Substitui o conjunto de serviços marcados — mesmo padrão de definirCategorias. */
export async function definirServicos(profissionalId, servicoIds) {
  const { error: delErr } = await supabase
    .from('profissional_servicos')
    .delete()
    .eq('profissional_id', profissionalId)
  if (delErr) throw delErr

  if (!servicoIds.length) return
  const { error } = await supabase
    .from('profissional_servicos')
    .insert(servicoIds.map((servico_id) => ({ profissional_id: profissionalId, servico_id })))
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

// ------------------------------------------------------- Conta e privacidade

/**
 * Exporta todos os dados pessoais da pessoa logada, em JSON.
 *
 * Atende ao direito de acesso e ao de portabilidade (LGPD art. 18, II e V).
 * Cada consulta respeita o RLS — ou seja, só traz o que aquela pessoa já
 * poderia ver. Não usa service role de propósito: se algum dado não sai
 * aqui, é porque a própria pessoa não tem acesso a ele.
 */
export async function exportarMeusDados(perfilId) {
  const [
    { data: perfil },
    { data: profissional },
    { data: contato },
    { data: bookingsCliente },
    { data: bookingsProf },
    { data: avaliacoesFeitas },
    { data: referencias }
  ] = await Promise.all([
    supabase.from('perfis').select('*').eq('id', perfilId).maybeSingle(),
    supabase.from('profissionais').select('*').eq('id', perfilId).maybeSingle(),
    supabase.from('contatos').select('*').eq('perfil_id', perfilId).maybeSingle(),
    supabase.from('bookings').select('*').eq('cliente_id', perfilId),
    supabase.from('bookings').select('*').eq('profissional_id', perfilId),
    supabase.from('avaliacoes').select('*').eq('autor_id', perfilId),
    supabase.from('referencias_trabalho').select('*').eq('profissional_id', perfilId)
  ])

  return {
    exportado_em: new Date().toISOString(),
    perfil: perfil ?? null,
    dados_profissionais: profissional ?? null,
    contato: contato ?? null,
    contratacoes_como_cliente: bookingsCliente ?? [],
    contratacoes_como_profissional: bookingsProf ?? [],
    avaliacoes_que_escrevi: avaliacoesFeitas ?? [],
    referencias_de_trabalho: referencias ?? []
  }
}

/**
 * Encerra a conta da pessoa logada.
 *
 * Apaga a linha em `perfis`, e o `on delete cascade` do schema leva junto
 * profissionais, contatos, bookings, avaliações, referências e demais
 * vínculos — sem deixar órfão.
 *
 * O usuário em `auth.users` NÃO é removido daqui: isso exige privilégio
 * de administrador, que o navegador não tem (e não deveria ter). Na
 * prática a conta fica inutilizável — sem perfil, o app não deixa entrar
 * em lugar nenhum — mas a remoção definitiva do login precisa ser feita
 * pelo admin no painel do Supabase. Isso está descrito na tela para não
 * prometer mais do que o sistema entrega.
 */
export async function encerrarMinhaConta(perfilId) {
  const { error } = await supabase.from('perfis').delete().eq('id', perfilId)
  if (error) throw error
  await supabase.auth.signOut()
}
