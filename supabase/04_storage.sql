-- ============================================================================
-- STORAGE — BUCKET PRIVADO PARA DOCUMENTOS SENSÍVEIS
-- ----------------------------------------------------------------------------
-- Antecedentes criminais é DADO SENSÍVEL sob a LGPD (art. 5º, II).
-- Regras aplicadas aqui:
--   • Bucket PRIVADO (public = false). Sem URL pública. Nunca.
--   • Só a dona do documento e o admin acessam.
--   • O admin abre via URL ASSINADA de curta duração (gerada no backend),
--     nunca por link permanente.
--   • O cliente NUNCA acessa este bucket. Ele vê apenas o selo derivado
--     de profissionais.visivel — nunca o documento.
-- ============================================================================

-- Bucket privado para documentos de verificação -------------------------------
insert into storage.buckets (id, name, public)
values ('documentos-verificacao', 'documentos-verificacao', false)
on conflict (id) do nothing;

-- Bucket público apenas para fotos de perfil ----------------------------------
insert into storage.buckets (id, name, public)
values ('fotos-perfil', 'fotos-perfil', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Convenção de caminho: documentos-verificacao/{profissional_id}/{tipo}-{ts}.pdf
-- A primeira pasta é o UUID da profissional — é o que as políticas conferem.
-- ----------------------------------------------------------------------------

-- A profissional envia documentos apenas para a própria pasta
create policy docs_insert_own
on storage.objects for insert
with check (
  bucket_id = 'documentos-verificacao'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- A profissional lê apenas os próprios documentos
create policy docs_select_own
on storage.objects for select
using (
  bucket_id = 'documentos-verificacao'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin lê todos os documentos (para conferência manual)
create policy docs_select_admin
on storage.objects for select
using (
  bucket_id = 'documentos-verificacao'
  and auth_role() = 'admin'
);

-- A profissional pode substituir um documento rejeitado
create policy docs_update_own
on storage.objects for update
using (
  bucket_id = 'documentos-verificacao'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Fotos de perfil: qualquer um lê, cada uma escreve na própria pasta
create policy fotos_select_public
on storage.objects for select
using (bucket_id = 'fotos-perfil');

create policy fotos_insert_own
on storage.objects for insert
with check (
  bucket_id = 'fotos-perfil'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- COMO O ADMIN ABRE UM DOCUMENTO (no backend, nunca no front)
-- ----------------------------------------------------------------------------
--   const { data } = await supabase.storage
--     .from('documentos-verificacao')
--     .createSignedUrl(path, 60);   // expira em 60 segundos
--
-- A URL assinada some sozinha. Não gere links longos nem os salve em lugar
-- nenhum. Nunca use getPublicUrl() neste bucket.
-- ============================================================================

-- ============================================================================
-- RETENÇÃO — LGPD (minimização, art. 6º, III)
-- ----------------------------------------------------------------------------
-- Depois da conferência, o resultado (aprovado/rejeitado) já está em
-- 'verificacoes'. O documento em si não precisa ficar guardado para sempre.
-- Sugestão: apagar o arquivo após a aprovação, mantendo só o registro do
-- resultado e a data. Menos dado guardado = menos risco em caso de vazamento.
--
-- Rode como job periódico (pg_cron ou Netlify scheduled function):
--   • listar verificacoes aprovadas há mais de N dias com documento_path
--   • remover o arquivo do storage
--   • setar documento_path = null (o status 'aprovado' permanece)
--
-- Defina N com orientação jurídica: prazo curto o bastante para minimizar
-- risco, longo o bastante para eventual comprovação de diligência.
-- ============================================================================
