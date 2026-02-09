import { useState } from 'react';
import logo from '../assets/icono.png';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '../services/api';

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      navigate('/');
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
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
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
