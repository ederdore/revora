import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Avaliar from './pages/Avaliar.jsx'
import EnviarMsg from './pages/EnviarMsg.jsx'
import SegmentLanding from './pages/SegmentLanding.jsx'
import Admin from './pages/Admin.jsx'
import Atendente from './pages/Atendente.jsx'
import BackOffice from './pages/BackOffice.jsx'
import AuthGuard from './components/AuthGuard.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/avaliar/:id" element={<Avaliar />} />
        <Route path="/enviar/:clientId" element={<EnviarMsg />} />

        {/* LPs segmento */}
        <Route path="/barbearia" element={<SegmentLanding />} />
        <Route path="/petshop" element={<SegmentLanding />} />
        <Route path="/clinica" element={<SegmentLanding />} />
        <Route path="/lojas" element={<SegmentLanding />} />
        <Route path="/concessionarias" element={<SegmentLanding />} />

        {/* App dono */}
        <Route path="/app/dashboard" element={
          <AuthGuard allowedRoles={['owner']}>
            <Admin />
          </AuthGuard>
        }/>

        {/* App atendente */}
        <Route path="/app/atender" element={
          <AuthGuard allowedRoles={['owner','attendant']}>
            <Atendente />
          </AuthGuard>
        }/>

        {/* Back-office */}
        <Route path="/gestao" element={<BackOffice />} />

        {/* Redirects legados */}
        <Route path="/admin" element={<Navigate to="/app/dashboard" />} />
        <Route path="/atendente" element={<Navigate to="/app/atender" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
