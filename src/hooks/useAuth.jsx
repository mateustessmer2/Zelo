import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================================
// AUTENTICAÇÃO
// ----------------------------------------------------------------------------
// Expõe: sessão, perfil (com o papel: cliente | profissional | admin) e ações.
// O papel importa muito aqui: é ele que a policy `avaliacoes_select_segmentado`
// usa para decidir quais avaliações a pessoa enxerga.
// ============================================================================

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      if (!data.session) setCarregando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      if (!novaSessao) {
        setPerfil(null)
        setCarregando(false)
      }
    })

    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!sessao?.user) return
    let ativo = true

    // Uma segunda tentativa depois de um instante. O perfil pode não
    // existir ainda no exato momento em que a sessão nasce — é o caso do
    // cadastro, em que o insert acontece logo após o signUp. Sem esta
    // retentativa, uma busca prematura gravava null e nunca mais tentava,
    // deixando a pessoa presa na tela de "conta sem dados".
    async function buscar(tentativa = 1) {
      const { data } = await supabase
        .from('perfis')
        .select('id, role, nome, foto_url, cidade_id, bairro_id')
        .eq('id', sessao.user.id)
        .maybeSingle()

      if (!ativo) return

      if (!data && tentativa === 1) {
        setTimeout(() => ativo && buscar(2), 800)
        return
      }

      setPerfil(data)
      setCarregando(false)
    }

    buscar()

    return () => { ativo = false }
  }, [sessao])

  const valor = {
    sessao,
    perfil,
    carregando,
    ehCliente: perfil?.role === 'cliente',
    ehProfissional: perfil?.role === 'profissional',
    ehAdmin: perfil?.role === 'admin',

    async entrar(email, senha) {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) throw error
    },

    /**
     * Cadastra e devolve `{ precisaConfirmarEmail }` para a tela decidir
     * o que mostrar — não navega nem assume mais nada sozinho.
     *
     * Os dados (role, nome, cidade, bairro, consentimento) viajam dentro
     * de `options.data`, viram `raw_user_meta_data` no auth.users, e o
     * trigger `criar_perfil_ao_registrar` (migração 19) monta as linhas
     * em `perfis`/`profissionais` a partir daí — sem depender de sessão.
     *
     * Isto substituiu o insert direto que existia aqui antes. Motivo:
     * com a confirmação de e-mail LIGADA, `signUp()` não cria sessão até
     * a pessoa clicar no link — e um insert feito pelo navegador exige
     * `auth.uid()`, que não existe nesse meio-tempo. O trigger no banco
     * roda com privilégio de sistema e não tem esse problema.
     */
    async cadastrar({ email, senha, nome, role, cidadeId, bairroId, termo, declaracaoAntecedentes, declarouVerdade, declarouApto }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            role,
            nome,
            cidade_id: cidadeId || null,
            bairro_id: bairroId || null,
            // Termo de Consentimento e Ciência do Usuário — vale para
            // cliente e profissional, gravado em `perfis` pelo trigger.
            termo_aceito: !!termo?.aceito,
            termo_versao: termo?.aceito ? termo.versao : null,
            declaracao_antecedentes_aceito: !!declaracaoAntecedentes?.aceito,
            declaracao_antecedentes_versao: declaracaoAntecedentes?.aceito ? declaracaoAntecedentes.versao : null,
            declarou_info_verdadeiras: !!declarouVerdade,
            declarou_apto_legalmente: !!declarouApto
          }
        }
      })

      // E-mail já cadastrado tem dois comportamentos possíveis no Supabase,
      // dependendo da configuração de confirmação por e-mail:
      //
      //  • confirmação DESLIGADA: vem `error` explícito com "already registered";
      //  • confirmação LIGADA: por proteção contra descoberta de e-mails,
      //    o Supabase finge sucesso e devolve um usuário com `identities`
      //    vazio, sem criar nada.
      const jaExiste =
        (error && /already\s*registered|already\s*exists|user\s*already/i.test(error.message)) ||
        (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)

      if (jaExiste) {
        const e = new Error('EMAIL_JA_CADASTRADO')
        e.code = 'EMAIL_JA_CADASTRADO'
        throw e
      }

      if (error) throw error

      // Sem `session`, a confirmação de e-mail está ligada e a pessoa
      // ainda não pode entrar — ela precisa abrir a caixa de entrada
      // primeiro. Com `session`, ela já está logada (confirmação
      // desligada), e o perfil chega pelo mesmo useEffect que já cobre
      // login — sem precisar de tratamento especial aqui.
      return { precisaConfirmarEmail: !data.session }
    },

    async sair() {
      await supabase.auth.signOut()
    },

    /**
     * Envia o e-mail com o link de recuperação.
     *
     * `redirectTo` precisa apontar para a tela de nova senha e estar na
     * lista de URLs permitidas do projeto (Supabase → Authentication →
     * URL Configuration → Redirect URLs). Sem isso o Supabase recusa o
     * redirecionamento por segurança.
     *
     * Nunca revela se o e-mail existe ou não: a resposta é a mesma nos
     * dois casos, para não permitir que alguém descubra quem tem conta.
     */
    async recuperarSenha(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nova-senha`
      })
      if (error) throw error
    },

    /**
     * Define a senha nova. Só funciona dentro da sessão temporária que o
     * link do e-mail cria — por isso a tela de nova senha não pede o
     * e-mail nem a senha antiga: quem chegou até ali já provou ter acesso
     * à caixa de entrada.
     */
    async definirNovaSenha(novaSenha) {
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw error
    }
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
