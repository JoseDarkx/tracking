import { useState, useEffect } from 'react';
import logo from '../assets/icono.webp';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login, isAuthenticated } from '../services/api';

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔐 Si ya está autenticado, no dejar ver el login
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss();

    if (!email || !password) {
      toast.error('Completa todos los campos');
      return;
    }

    try {
      setLoading(true);

      const response = await login(email, password);

      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      toast.success(`Bienvenido ${response.user.nombre}`);

      // 🔥 Redirige correctamente al dashboard
      navigate('/dashboard');

    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Credenciales incorrectas');
      } else {
        toast.error('Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src={logo} alt="SurCompany Logo" className="login-logo-icon" />
            <h1>SurCompany Tracker</h1>
          </div>
          <p className="login-subtitle">
            Inicia sesión con tu usuario corporativo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-input password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? 'Procesando…' : '🔐 Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
