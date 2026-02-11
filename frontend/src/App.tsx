import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/dashboard';
import Login from './pages/Login';
import AdminCreateUser from './pages/AdminCreateUser';
import PublicView from './pages/PublicView';

function App() {
  const PrivateLayout = ({ children }: { children: React.ReactNode }) => (
    <>
      <Navbar />
      <div className="app">
        <Sidebar />
        <main className="main">
          <div className="main-container">{children}</div>
        </main>
      </div>
    </>
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
                <AdminCreateUser />
              </PrivateLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
