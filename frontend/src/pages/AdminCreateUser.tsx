import { useState } from 'react';
import toast from 'react-hot-toast';
import { createUser, adminChangePasswordByEmail, getCurrentUser } from '../services/api';

const AdminCreateUser = () => {
  const currentUser = getCurrentUser();

  // =============================
  // CREAR USUARIO
  // =============================
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [loading, setLoading] = useState(false);

  // =============================
  // CAMBIAR PASSWORD
  // =============================
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // =============================
  // CREAR USUARIO
  // =============================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss();

    if (!nombre || !email || !password) {
      toast.error('Completa todos los campos');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      await createUser({ nombre, email, password, role });

      toast.success('Usuario creado correctamente');

      setNombre('');
      setEmail('');
      setPassword('');
      setRole('employee');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // CAMBIAR PASSWORD
  // =============================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.dismiss();

    if (!resetEmail || !newPassword) {
      toast.error('Completa todos los campos');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    try {
      setResetLoading(true);
      await adminChangePasswordByEmail(resetEmail, newPassword);

      toast.success('Contraseña actualizada correctamente');

      setResetEmail('');
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar contraseña');
    } finally {
      setResetLoading(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="page-header">
        <h1>No autorizado</h1>
      </div>
    );
  }

  return (
    <>
      {/* ========================= */}
      {/* CREAR USUARIO */}
      {/* ========================= */}
      <div className="page-header">
        <h1 className="page-title">Administración de Usuarios</h1>
        <p className="page-description">
          Crear usuarios y cambiar contraseñas
        </p>
      </div>

      <div className="form-section">
        <h2>Crear usuario</h2>
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input
              className="form-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Rol</label>
            <select
              className="form-input"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as 'admin' | 'employee')
              }
            >
              <option value="employee">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <button className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      </div>

      {/* ========================= */}
      {/* CAMBIAR PASSWORD */}
      {/* ========================= */}
      <div className="form-section" style={{ marginTop: '40px' }}>
        <h2>Restablecer contraseña</h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Correo del usuario</label>
            <input
              className="form-input"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <input
              className="form-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <button className="btn btn-danger btn-lg" disabled={resetLoading}>
            {resetLoading ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </>
  );
};

export default AdminCreateUser;
