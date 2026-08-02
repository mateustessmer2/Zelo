# Aviso ao admin sobre cadastros e aprovações pendentes

E-mail para o admin sempre que houver algo novo para acompanhar ou aprovar.

Reaproveita a mesma conta Resend e os mesmos secrets já usados pela função
`notificar-booking` — não precisa configurar credencial nova.

---

## 1. Publicar a função

No Supabase: **Edge Functions → Deploy a new function → Via Editor**

- Nome: `notificar-cadastro`
- Cole o conteúdo de `index.ts`
- Deploy

Depois, em **Settings** da função, desligue **Verify JWT with legacy
secret** — os webhooks do banco não enviam esse tipo de token, e com a
verificação ligada eles recebem 401 e a notificação nunca dispara.

---

## 2. Secrets

Já existem, se você configurou a função de pedidos:

| Nome | Valor |
|---|---|
| `RESEND_API_KEY` | a API key do Resend |
| `ADMIN_EMAIL` | `zeloemcasa@gmail.com` |

Se ainda não existirem: **Edge Functions → Secrets**.

---

## 3. Criar os webhooks

Uma mesma função, chamada por três webhooks diferentes. Em
**Database → Webhooks → Create a new hook**, repita para cada um:

| Nome | Tabela | Evento | Função |
|---|---|---|---|
| `aviso-cadastro-profissional` | `profissionais` | Insert | `notificar-cadastro` |
| `aviso-documento-enviado` | `verificacoes` | Insert | `notificar-cadastro` |
| `aviso-referencia-enviada` | `referencias_trabalho` | Insert | `notificar-cadastro` |

Tipo: **Supabase Edge Functions** · Method: **POST**

A função descobre sozinha qual evento chegou, pelo campo `table` do
payload — por isso os três apontam para o mesmo lugar.

---

## 4. O que cada aviso diz

**Cadastro novo** (`profissionais`) — alguém criou conta de profissional.
Ainda não há documento para conferir; serve para você acompanhar quem
começou e eventualmente travou no meio do caminho.

**Documento enviado** (`verificacoes`) — este é o que exige ação: tem
identidade ou selfie esperando sua conferência na fila.

**Referência enviada** (`referencias_trabalho`) — alguém cadastrou um
contato de referência, que precisa de uma ligação sua para confirmar.

---

## 5. Testar

Crie uma conta de profissional de teste e envie um documento. Depois:

```sql
select created_at, destino_profissional, destino_admin
  from notificacoes_log
 order by created_at desc
 limit 5;
```

- `destino_admin = enviado` → funcionando, confira a caixa de entrada.
- `destino_admin = falhou: ...` → o erro do Resend vem junto na mensagem.

---

## Observação sobre volume

Com três webhooks ativos, um cadastro completo gera até quatro e-mails
(conta + identidade + selfie + referência). No começo isso é útil — você
acompanha cada passo. Se ficar barulhento demais quando o volume crescer,
o webhook de `profissionais` é o primeiro a desativar: ele avisa sobre
algo que ainda não exige ação sua.

---

## 6. Parabéns ao profissional (webhook extra)

Um quarto webhook, apontando para a mesma função, mas com **UPDATE** em
vez de Insert:

| Nome | Tabela | Evento | Função |
|---|---|---|---|
| `aviso-perfil-aprovado` | `verificacoes` | Update | `notificar-cadastro` |

A função detecta sozinha que é um UPDATE (não Insert) e desvia para a
lógica de parabéns. Ela só envia o e-mail quando a aprovação em questão
**completa o par** — identidade e selfie ambas aprovadas — não a cada
aprovação individual. Se só a identidade foi aprovada e a selfie ainda
está pendente, nada é enviado; o e-mail sai quando a segunda também for
aprovada e o perfil ficar visível de fato.

O e-mail vai para o endereço de cadastro da própria profissional (não
para o admin), usando `supabase.auth.admin.getUserById` para buscar o
e-mail a partir do id — por isso a função depende da service role key,
que já está configurada.
