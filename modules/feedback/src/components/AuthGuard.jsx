import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'

// Protege rotas baseado em role
// allowedRoles: ['owner'] | ['attendant'] | ['owner','attendant']
export default function AuthGuard({ children, allowedRoles = ['owner'] }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | ok | denied

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }

      const { data: user } = await supabase
        .from('users')
        .select('role, business_id, active')
        .eq('auth_id', session.user.id)
        .single()

      if (!user || !user.active) { navigate('/login'); return }
      if (!allowedRoles.includes(user.role) && !allowedRoles.includes('any')) {
        // Wrong role — redirect to correct area
        if (user.role === 'owner') navigate('/app/dashboard')
        else if (user.role === 'attendant') navigate('/app/atender')
        else navigate('/login')
        return
      }
      setStatus('ok')
    }
    check()
  }, [])

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans,sans-serif', color: '#888' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 12, fontFamily: 'Syne,sans-serif', fontWeight: 900, color: '#F5C518' }}>Revora</div>
        <div style={{ fontSize: 13 }}>Verificando acesso...</div>
      </div>
    </div>
  )

  return children
}
