import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
// import Sidebar from './components/Sidebar'; <--- YA NO LO NECESITAMOS
import ProtectedRoute from './components/ProtectedRoute';

// Early routes (Eager Loading)
import Login from './pages/Login';
import PublicView from './pages/PublicView';
import CotizacionesCerradas from './pages/CotizacionesCerradas';

// Lazy-loaded routes para optimizar el bundle inicial (Code Splitting)
const Dashboard = lazy(() => import('./pages/dashboard'));
const AdminCreateUser = lazy(() => import('./pages/AdminCreateUser'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

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

      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
          Cargando pantalla...
        </div>
      }>
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

          <Route
            path="/cotizaciones/cerradas"
            element={
              <ProtectedRoute>
                <PrivateLayout>
                  <CotizacionesCerradas />
                </PrivateLayout>
              </ProtectedRoute>
            }
          />

        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;