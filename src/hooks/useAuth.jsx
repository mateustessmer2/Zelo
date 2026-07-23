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

    supabase
      .from('perfis')
      .select('id, role, nome, foto_url, telefone, cidade_id, bairro_id')
      .eq('id', sessao.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo) return
        setPerfil(data)
        setCarregando(false)
      })

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

    async cadastrar({ email, senha, nome, role, cidadeId, bairroId }) {
      const { data, error } = await supabase.auth.signUp({ email, password: senha })
      if (error) throw error

      const userId = data.user?.id
      if (!userId) return

      const { error: perfilErr } = await supabase.from('perfis').insert({
        id: userId, role, nome, cidade_id: cidadeId, bairro_id: bairroId
      })
      if (perfilErr) throw perfilErr

      // Profissional ganha a linha em `profissionais` já com verificação pendente.
      // Ela só aparece na busca depois que identidade E antecedentes forem
      // aprovados — a coluna `visivel` é gerada pelo banco.
      if (role === 'profissional') {
        const { error: profErr } = await supabase.from('profissionais').insert({ id: userId })
        if (profErr) throw profErr
      }
    },

    async sair() {
      await supabase.auth.signOut()
    }
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
