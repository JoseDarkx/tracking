import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/dashboard';
import Login from './pages/Login';
import AdminCreateUser from './pages/AdminCreateUser';

function App() {
  const PrivateLayout = ({ children }: { children: React.ReactNode }) => (
    <>
      <Navbar />
      <div className="app">
        <Sidebar />
        <main className="main">
          <div className="main-container">
            {children}
          </div>
        </main>
      </div>
    </>
  );

  return (
    <Router>
      <Toaster position="bottom-right" />

      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />

        {/* PRIVATE */}
        <Route
          path="/"
          element={
            <PrivateLayout>
              <Dashboard />
            </PrivateLayout>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <PrivateLayout>
              <AdminCreateUser />
            </PrivateLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
