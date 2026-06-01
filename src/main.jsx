import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Admin from './pages/Admin.jsx'
import Atendente from './pages/Atendente.jsx'
import BackOffice from './pages/BackOffice.jsx'
import Avaliar from './pages/Avaliar.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/atendente" element={<Atendente />} />
        <Route path="/gestao" element={<BackOffice />} />
        <Route path="/avaliar/:id" element={<Avaliar />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
