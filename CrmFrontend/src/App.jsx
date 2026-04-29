import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import WebsitePage from './website/WebsitePage.jsx'
import { AuthProvider } from './modules/auth/AuthContext.jsx'
import { crmRouteElements } from './routes/crmRouteElements.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<WebsitePage />} />
          {crmRouteElements}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
