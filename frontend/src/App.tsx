import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/login';

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <div className="app">
                <Sidebar />
                <main className="main">
                  <div className="main-container">
                    <Dashboard />
                  </div>
                </main>
              </div>
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;