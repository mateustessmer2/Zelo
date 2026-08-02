# Zelo — Segurança e LGPD

## Estrutura LGPD implementada
- Página de Termos de Uso
- Página de Política de Privacidade
- Área "Minha conta e privacidade": exportar dados, encerrar conta
- Selo de verificação clicável com modal explicativo
- Rodapé com links permanentes para Termos e Privacidade
- Termo de Consentimento único, válido tanto para cliente quanto para profissional

## Dados sensíveis
- Documentos de identidade e selfie: bucket privado, nunca exibidos ao cliente (só o selo de verificação aparece)
- Antecedentes criminais: fase atual é autodeclaração; documentos não ficam armazenados

## Infraestrutura de e-mail
- Domínio próprio (zeloemcasa.com.br) verificado no Resend
- SMTP com domínio próprio testado e funcionando
- Notificação automática por e-mail para o admin (zeloemcasa@gmail.com) quando há: cadastro de profissional, documento enviado, ou referência de trabalho para aprovar (via Edge Function + webhooks do banco)

## Notificações
- WhatsApp (Cloud API da Meta) quando um pedido é criado — mensagem para a profissional e cópia para o admin

## Pontos em aberto / a revisar
- Confirmação de e-mail no cadastro segue desligada
- Checagem obrigatória de antecedentes criminais por serviço externo está temporariamente desabilitada (hoje é autodeclaração)
- Auditoria completa pré-lançamento (multi-papel, por etapas, sem quebrar funcionalidades) foi solicitada — ainda não confirmada como concluída
