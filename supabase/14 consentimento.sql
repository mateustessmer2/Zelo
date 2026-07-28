-- ============================================================================
-- MIGRAÇÃO 14 — REGISTRO DE CONSENTIMENTO (LGPD)
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 13.
--
-- POR QUE GRAVAR ISTO NO BANCO
--
-- A LGPD não exige só que você peça consentimento — exige que consiga
-- PROVAR que pediu (art. 8º, §2º: o ônus da prova é do controlador). Um
-- checkbox que só existe na tela não prova nada depois.
--
-- Por isso três campos:
--   • quando a pessoa aceitou
--   • qual versão do texto ela viu (o termo vai mudar; a prova precisa
--     apontar para o texto exato daquele momento)
--   • que ela aceitou (redundante com a data, mas deixa a leitura óbvia)
--
-- O QUE ESTE TERMO PROMETE — e que o produto precisa cumprir
--
-- O termo declara que a selfie e a certidão de antecedentes são apagadas
-- após a conferência. Isso é uma obrigação, não uma intenção: se o arquivo
-- continuar no bucket depois de aprovado, o consentimento vira falso.
-- Ver bloco final de 04_storage.sql (retenção) e a decisão de conferir
-- os antecedentes presencialmente na fase inicial.
-- ============================================================================

alter table profissionais
  add column if not exists consentimento_verificacao boolean not null default false;

alter table profissionais
  add column if not exists consentimento_em timestamptz;

alter table profissionais
  add column if not exists consentimento_versao text;

comment on column profissionais.consentimento_verificacao is
  'Aceite do Termo de Consentimento para Verificação de Identidade (LGPD art. 7º, I).';
comment on column profissionais.consentimento_em is
  'Data e hora do aceite — é a prova exigida pelo art. 8º, §2º.';
comment on column profissionais.consentimento_versao is
  'Versão do texto que a pessoa leu. Ao alterar o termo, suba a versão.';


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select p.nome, pr.consentimento_verificacao, pr.consentimento_em, pr.consentimento_versao
--   from profissionais pr join perfis p on p.id = pr.id;
-- ----------------------------------------------------------------------------
