import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Públicas
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Avaliar from './pages/Avaliar.jsx'
import SegmentLanding from './pages/SegmentLanding.jsx'

// App — Dono
import Admin from './pages/Admin.jsx'

// App — Atendente
import Atendente from './pages/Atendente.jsx'

// Back-office Revora
import BackOffice from './pages/BackOffice.jsx'

// Auth guard
import AuthGuard from './components/AuthGuard.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>

        {/* ── PÚBLICAS ── */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/avaliar/:id" element={<Avaliar />} />

        {/* ── LPs por segmento ── */}
        <Route path="/barbearia" element={<SegmentLanding />} />
        <Route path="/petshop" element={<SegmentLanding />} />
        <Route path="/clinica" element={<SegmentLanding />} />
        <Route path="/lojas" element={<SegmentLanding />} />
        <Route path="/concessionarias" element={<SegmentLanding />} />

        {/* ── APP DONO (requer auth owner) ── */}
        <Route path="/app/dashboard" element={
          <AuthGuard allowedRoles={['owner']}>
            <Admin />
          </AuthGuard>
        }/>

        {/* ── APP ATENDENTE (requer auth attendant ou owner) ── */}
        <Route path="/app/atender" element={
          <AuthGuard allowedRoles={['owner','attendant']}>
            <Atendente />
          </AuthGuard>
        }/>

        {/* ── BACK-OFFICE REVORA (sem auth por ora) ── */}
        <Route path="/gestao" element={<BackOffice />} />

        {/* ── REDIRECTS legados ── */}
        <Route path="/admin" element={<Navigate to="/app/dashboard" />} />
        <Route path="/atendente" element={<Navigate to="/app/atender" />} />

        {/* ── 404 ── */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
