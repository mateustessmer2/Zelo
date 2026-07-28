# WhatsApp automático — guia de configuração

Notificação disparada quando um cliente cria um pedido: uma mensagem para a
profissional, outra para você (admin).

O código já está pronto. O que falta é burocracia da Meta — reserve umas
duas horas, e conte com 1 a 3 dias de espera pela aprovação dos templates.

---

## Ordem geral

1. Conta na Meta e número de WhatsApp
2. Criar os dois templates e esperar aprovação
3. Publicar a Edge Function no Supabase
4. Configurar os secrets
5. Ligar o webhook do banco
6. Testar

---

## 1. Conta na Meta

Em **developers.facebook.com** → criar app → tipo **Business** → adicionar o
produto **WhatsApp**.

Você vai precisar de:

- **Phone Number ID** — aparece em WhatsApp → API Setup. É um número longo,
  não é o telefone em si.
- **Token permanente** — o token de teste expira em 24h e não serve. Gere um
  permanente em Business Settings → Users → System Users → criar um usuário
  de sistema com acesso ao app, e gerar token com as permissões
  `whatsapp_business_messaging` e `whatsapp_business_management`.

O número que envia não pode ser o mesmo que você usa no WhatsApp comum. Use
um chip separado, ou o número fixo do Zelo se você tiver.

**Verificação do negócio:** a Meta vai pedir CNPJ e documentos. Sem isso o
limite fica em 250 mensagens por dia — o que aliás é bem mais do que você
vai precisar no começo, então dá para deixar essa etapa para depois.

---

## 2. Templates

Em **WhatsApp Manager → Message Templates → Create**.

Os dois precisam ser criados com **categoria "Utility"** (utilidade). Se você
marcar Marketing, a Meta cobra ~10x mais e ainda pode rejeitar, porque o
conteúdo é transacional.

### Template 1 — `pedido_novo_profissional`

Idioma: **Português (BR)**

Corpo:

```
Oi {{1}}! Você recebeu um pedido de {{2}} para {{3}} no dia {{4}}, {{5}}, no bairro {{6}}. Abra o Zelo para aceitar ou recusar.
```

Exemplos (a Meta exige preencher para revisar):
`Creuza`, `Mateus`, `Faxineira`, `28/07/2026`, `manhã`, `São Gonçalo`

### Template 2 — `pedido_novo_admin`

Idioma: **Português (BR)**

Corpo:

```
Novo pedido no Zelo: {{1}} pediu {{2}} para {{3}} em {{4}}, {{5}}. Profissional: {{6}}.
```

Exemplos:
`Mateus`, `Faxineira`, `28/07/2026`, `São Gonçalo`, `manhã`, `Creuza`

> Os nomes dos templates precisam ser **exatamente** esses — a Edge Function
> os chama por nome. Se quiser mudar, mude nos dois lugares.

---

## 3. Publicar a Edge Function

Pelo navegador não dá — a publicação exige a CLI do Supabase. Duas saídas:

**a) Alguém com terminal roda uma vez:**

```bash
npx supabase login
npx supabase link --project-ref oeudealasfitrwnyfagq
npx supabase functions deploy notificar-booking
```

**b) Pelo painel:** Edge Functions → Create a new function → colar o conteúdo
de `supabase/functions/notificar-booking/index.ts` no editor do painel.
Mais lento, mas funciona sem terminal.

---

## 4. Secrets

Supabase → **Edge Functions → Secrets** (ou Settings → Edge Functions):

| Nome | Valor |
|---|---|
| `WHATSAPP_TOKEN` | token permanente da Meta |
| `WHATSAPP_PHONE_ID` | Phone Number ID |
| `ADMIN_WHATSAPP` | seu número, ex: `5553999999999` |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão — não
precisa criar.

> Nunca coloque o token da Meta no código do app. Qualquer pessoa leria e
> passaria a mandar mensagem em nome do Zelo.

---

## 5. Ligar o webhook

Supabase → **Database → Webhooks → Create a new hook**:

- Nome: `notificar-booking`
- Tabela: `bookings`
- Eventos: **Insert**
- Tipo: **Supabase Edge Functions**
- Função: `notificar-booking`
- Method: POST

---

## 6. Testar

Rode o `15_notificacoes.sql` antes (cria a tabela de log).

Faça um pedido de teste como cliente. Depois:

```sql
select * from notificacoes_log order by created_at desc limit 5;
```

- `enviado` nos dois campos → funcionando.
- `sem telefone cadastrado` → a profissional não preencheu o telefone em
  Meu perfil.
- `falhou: Meta 400 ...` → a mensagem de erro da Meta vem junto. Quase sempre
  é template ainda não aprovado ou nome escrito diferente.

---

## Custo

Categoria utilidade no Brasil: cerca de **R$ 0,04 a R$ 0,05** por mensagem.
Dois envios por pedido (profissional + admin). Com 100 pedidos no mês, algo
em torno de **R$ 10**. A Meta não cobra mensalidade — só o que você envia.

---

## O que ainda não está coberto

- **Aceite/recusa** não notifica o cliente. Mesmo caminho, template novo.
- **Sem retry**: se a Meta estiver fora do ar no momento exato do pedido, a
  mensagem se perde. O log registra a falha; por ora o resgate é manual.
- **Revogação**: a profissional não tem como pedir para parar de receber.
  Enquanto o volume for pequeno e o contato for direto, resolve-se por
  conversa — mas vale entrar no roadmap.
