import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Admin from './pages/Admin.jsx'
import Atendente from './pages/Atendente.jsx'
import BackOffice from './pages/BackOffice.jsx'
import Avaliar from './pages/Avaliar.jsx'
import SegmentLanding from './pages/SegmentLanding.jsx'
import Cadastro from './pages/Cadastro.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Rotas fixas primeiro */}
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/atendente" element={<Atendente />} />
        <Route path="/gestao" element={<BackOffice />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/avaliar/:id" element={<Avaliar />} />

        {/* LPs de segmento — rotas explícitas */}
        <Route path="/barbearia" element={<SegmentLanding />} />
        <Route path="/petshop" element={<SegmentLanding />} />
        <Route path="/clinica" element={<SegmentLanding />} />
        <Route path="/lojas" element={<SegmentLanding />} />
        <Route path="/concessionarias" element={<SegmentLanding />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
