import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import AdminApp from './AdminApp';
import ProfilePageWrapper from './components/ProfilePageWrapper';

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/perfil" element={<ProfilePageWrapper />} />
        <Route path="/admincp" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
