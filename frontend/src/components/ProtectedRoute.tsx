import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/api';

/**
 * Propiedades para el componente ProtectedRoute.
 */
interface ProtectedRouteProps {
  /** Elementos hijos que requieren autenticación. */
  children: React.ReactNode;
}

/**
 * Componente que protege rutas privadas.
 * Redirige al usuario al login si no está autenticado.
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;