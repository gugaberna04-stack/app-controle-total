"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Trophy, Mail, Lock, User, CheckCircle, AlertCircle } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // Verifica se já está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/')
        router.refresh()
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isLogin) {
        // LOGIN
        console.log('Tentando fazer login com:', email)
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          console.error('Erro no login:', error)
          
          // Mensagens de erro mais específicas
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Email ou senha incorretos. Verifique suas credenciais e tente novamente.')
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.')
          } else {
            throw error
          }
        }
        
        if (data.user) {
          console.log('Login bem-sucedido:', data.user.id)
          
          // Verifica se perfil existe, se não, cria
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single()

          if (!profile) {
            console.log('Criando perfil para usuário:', data.user.id)
            await supabase.from('profiles').insert({
              id: data.user.id,
              name: data.user.user_metadata?.name || 'Usuário'
            })

            await supabase.from('user_stats').insert({
              user_id: data.user.id
            })
          }

          setSuccess('Login realizado com sucesso! Redirecionando...')
          
          // Aguarda um pouco e força o redirecionamento
          await new Promise(resolve => setTimeout(resolve, 1000))
          window.location.href = '/'
        }
      } else {
        // CADASTRO
        console.log('Tentando criar conta para:', email)
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        
        if (error) {
          console.error('Erro no cadastro:', error)
          throw error
        }

        if (data.user) {
          console.log('Usuário criado:', data.user.id)
          
          // Verifica se precisa confirmar email
          if (data.user.identities && data.user.identities.length === 0) {
            setSuccess('Um email já existe com essas credenciais. Por favor, faça login.')
            setTimeout(() => setIsLogin(true), 2000)
            return
          }

          // Cria perfil e stats imediatamente
          try {
            await supabase.from('profiles').insert({
              id: data.user.id,
              name: name
            })

            await supabase.from('user_stats').insert({
              user_id: data.user.id
            })
            
            console.log('Perfil e stats criados com sucesso')
          } catch (dbError) {
            console.error('Erro ao criar perfil:', dbError)
          }

          // Verifica se o Supabase está configurado para confirmar email
          if (data.session) {
            // Login automático habilitado
            setSuccess('Conta criada com sucesso! Redirecionando...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            window.location.href = '/'
          } else {
            // Confirmação de email necessária
            setSuccess('Conta criada! Por favor, verifique seu email para confirmar sua conta antes de fazer login.')
            setTimeout(() => setIsLogin(true), 3000)
          }
        }
      }
    } catch (error: any) {
      console.error('Erro de autenticação:', error)
      setError(error.message || 'Ocorreu um erro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.')
      setTimeout(() => setShowForgotPassword(false), 3000)
    } catch (error: any) {
      setError(error.message || 'Erro ao enviar email de recuperação')
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #0f172a, #581c87, #0f172a)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ width: '100%', maxWidth: '28rem' }}>
          {/* Logo/Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '4rem',
              height: '4rem',
              background: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
              borderRadius: '1rem',
              marginBottom: '1rem'
            }}>
              <Trophy style={{ width: '2.5rem', height: '2.5rem', color: 'white' }} />
            </div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
              Recuperar Senha
            </h1>
            <p style={{ color: '#d1d5db' }}>Digite seu email para receber o link</p>
          </div>

          {/* Forgot Password Form */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <form onSubmit={handleForgotPassword}>
              {/* Email Field */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#e5e7eb', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#9ca3af' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    style={{
                      width: '100%',
                      paddingLeft: '2.5rem',
                      paddingRight: '1rem',
                      paddingTop: '0.75rem',
                      paddingBottom: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}>
                  <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#fca5a5', flexShrink: 0, marginTop: '0.125rem' }} />
                  <p style={{ color: '#fca5a5', fontSize: '0.875rem' }}>{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#86efac' }} />
                  <p style={{ color: '#86efac', fontSize: '0.875rem' }}>{success}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(to right, #9333ea, #ec4899)',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  transition: 'all 0.3s',
                  marginBottom: '1rem'
                }}
              >
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#d1d5db',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                Voltar para Login
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #0f172a, #581c87, #0f172a)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '4rem',
            height: '4rem',
            background: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
            borderRadius: '1rem',
            marginBottom: '1rem'
          }}>
            <Trophy style={{ width: '2.5rem', height: '2.5rem', color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
            The Coach
          </h1>
          <p style={{ color: '#d1d5db' }}>Exercícios para Saúde Masculina</p>
        </div>

        {/* Auth Form */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          borderRadius: '1rem',
          padding: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* Toggle Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setIsLogin(true)
                setError('')
                setSuccess('')
              }}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s',
                background: isLogin ? '#9333ea' : 'rgba(255, 255, 255, 0.05)',
                color: isLogin ? 'white' : '#d1d5db'
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false)
                setError('')
                setSuccess('')
              }}
              style={{
                flex: 1,
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s',
                background: !isLogin ? '#9333ea' : 'rgba(255, 255, 255, 0.05)',
                color: !isLogin ? 'white' : '#d1d5db'
              }}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Nome Field (only for signup) */}
            {!isLogin && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#e5e7eb', marginBottom: '0.5rem' }}>
                  Nome
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#9ca3af' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required={!isLogin}
                    style={{
                      width: '100%',
                      paddingLeft: '2.5rem',
                      paddingRight: '1rem',
                      paddingTop: '0.75rem',
                      paddingBottom: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#e5e7eb', marginBottom: '0.5rem' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#9ca3af' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.75rem',
                    paddingBottom: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#e5e7eb' }}>
                  Senha
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a855f7',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#9ca3af' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    paddingLeft: '2.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.75rem',
                    paddingBottom: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.5rem',
                    color: 'white',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#fca5a5', flexShrink: 0, marginTop: '0.125rem' }} />
                <p style={{ color: '#fca5a5', fontSize: '0.875rem' }}>{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#86efac' }} />
                <p style={{ color: '#86efac', fontSize: '0.875rem' }}>{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(to right, #9333ea, #ec4899)',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.3s'
              }}
            >
              {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          Seus dados estão seguros e protegidos
        </p>
      </div>
    </div>
  )
}
