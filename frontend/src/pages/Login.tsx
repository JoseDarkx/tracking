import { useState } from 'react';
import logo from '../assets/icono.png';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login, register } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form state
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      if (!email || !password) {
        toast.error('Completa todos los campos');
        return;
      }
    } else {
      if (!nombre || !email || !password) {
        toast.error('Completa todos los campos');
        return;
      }
      if (password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        return;
      }
    }

    try {
      setLoading(true);
      
      if (isLogin) {
        const response = await login(email, password);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success(`¡Bienvenido ${response.user.nombre}!`);
      } else {
        const response = await register(nombre, email, password, role);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success('¡Cuenta creada exitosamente!');
      }

      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error en la autenticación';
      toast.error(message);
      console.error(error);
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
            {isLogin 
              ? 'Inicia sesión para gestionar tus cotizaciones'
              : 'Crea tu cuenta para comenzar'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input
                type="text"
                className="form-input"
                placeholder="Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="pepito@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
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
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            {!isLogin && (
              <p className="form-hint">Mínimo 6 caracteres</p>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Tipo de cuenta</label>
              <select
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="employee">👤 Empleado</option>
                <option value="admin">👨‍💼 Administrador</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner-small"></span>
                <span>Procesando...</span>
              </>
            ) : (
              <span>{isLogin ? '🔐 Iniciar Sesión' : '📝 Crear Cuenta'}</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="login-toggle"
            onClick={() => {
              setIsLogin(!isLogin);
              setNombre('');
              setEmail('');
              setPassword('');
              setRole('employee');
            }}
            disabled={loading}
          >
            {isLogin 
              ? '¿No tienes cuenta? Regístrate' 
              : '¿Ya tienes cuenta? Inicia sesión'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;