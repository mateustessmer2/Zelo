# Envio de referência por e-mail ao contratar

Diferente das outras funções, esta **não usa webhook** — ela é chamada
diretamente pelo frontend (`supabase.functions.invoke`) no momento em que
o cliente aceita o disclaimer e contrata.

---

## 1. Publicar a função

**Edge Functions → Deploy a new function → Via Editor**

- Nome: `enviar-referencia`
- Cole o conteúdo de `index.ts`
- Deploy

Em **Settings** da função, desligue **Verify JWT with legacy secret** —
a função verifica autenticação por conta própria (lendo o token do
usuário), então não precisa dessa camada extra, e ligá-la pode conflitar
com a forma como `supabase.functions.invoke` envia o cabeçalho.

---

## 2. Secrets

Reaproveita o que já existe:

| Nome | Valor |
|---|---|
| `RESEND_API_KEY` | mesma chave já usada nas outras funções |

Não precisa de `ADMIN_EMAIL` aqui — o destinatário é sempre o cliente
que está contratando, descoberto a partir do próprio token de sessão.

---

## 3. Sem webhook

Esta função não precisa de nenhum Database Webhook. Ela é chamada direto
pelo código React (`solicitarEnvioReferencia` em `src/lib/api.js`) assim
que o cliente aceita o disclaimer no perfil da profissional.

---

## 4. Testar

Cadastre uma referência para uma profissional de teste, aprove-a como
admin. Depois, como cliente, abra o perfil dela e clique em Contratar —
o disclaimer deve aparecer (porque agora há referência aprovada). Aceite
e confirme que o e-mail chega na caixa do cliente, com primeiro nome e
telefone da referência.

Para conferir o registro de divulgação:

```sql
select * from divulgacoes_referencia order by enviado_em desc limit 5;
```

---

## 5. O que acontece se o admin bloquear depois

Se o admin bloquear a referência (no Painel Admin → Referências
aprovadas), ela some da contagem pública (`contar_referencias_aprovadas`)
e a Edge Function passa a não encontrar nada para enviar — o cliente que
contratar depois disso não recebe mais o e-mail com aquele contato,
mesmo que a profissional continue tendo a referência registrada como já
aprovada uma vez.
