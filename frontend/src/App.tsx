import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
// import Sidebar from './components/Sidebar'; <--- YA NO LO NECESITAMOS
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/dashboard'; // Asegúrate de que coincida mayúscula/minúscula con tu archivo real
import Login from './pages/Login';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminDashboard from './pages/AdminDashboard';
import PublicView from './pages/PublicView';

function App() {
  // 👇 LAYOUT LIMPIO: Solo Navbar arriba y contenido ancho completo
  const PrivateLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );

  return (
    <Router>
      <Toaster position="bottom-right" />

      <Routes>
        {/* ROOT → siempre manda a login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/c/:slug" element={<PublicView />} />

        {/* PRIVATE */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                <Dashboard />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                {/* Agregamos un contenedor para que no se pegue a los bordes en estas pantallas */}
                <div className="max-w-7xl mx-auto px-4 py-6">
                   <AdminCreateUser />
                </div>
              </PrivateLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <PrivateLayout>
                 <div className="max-w-7xl mx-auto px-4 py-6">
                    <AdminDashboard />
                 </div>
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;