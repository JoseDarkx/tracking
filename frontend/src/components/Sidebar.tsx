import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <span className="sidebar-nav-icon">📊</span>
          <span>Dashboard</span>
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;