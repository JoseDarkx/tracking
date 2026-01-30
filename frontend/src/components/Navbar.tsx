// frontend/src/components/Navbar.tsx
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/api';
import toast from 'react-hot-toast';
import logo from '../assets/icono.png';

const Navbar = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src={logo} alt="SurCompany Logo" className="navbar-brand-icon" />
        <span>SurCompany Tracker</span>
      </div>
      <div className="navbar-user">
        <span>Hola, {user?.nombre || 'Usuario'}</span>
        <button 
          onClick={handleLogout}
          className="btn-logout"
          title="Cerrar sesión"
        > Cerrar sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;