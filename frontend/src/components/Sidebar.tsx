import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../services/api';

const Sidebar = () => {
  const location = useLocation();
  const user = getCurrentUser();

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <span className="sidebar-nav-icon">📊</span>
          <span>Dashboard</span>
        </Link>

        {/* SOLO ADMIN */}
        {user?.role === 'admin' && (
          <>
            <Link
              to="/admin/dashboard"
              className={location.pathname === '/admin/dashboard' ? 'active' : ''}
            >
              <span className="sidebar-nav-icon">📈</span>
              <span>Estadísticas</span>
            </Link>
            <Link
              to="/admin/usuarios"
              className={location.pathname === '/admin/usuarios' ? 'active' : ''}
            >
              <span className="sidebar-nav-icon">👤</span>
              <span>Crear usuario</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
