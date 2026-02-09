import { useState } from 'react';
import toast from 'react-hot-toast';
import { createUser } from '../services/api';

const AdminCreateUser = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Crear usuario</h1>
        <p className="page-description">
          Crea usuarios internos para el sistema
        </p>
      </div>

      <div className="form-section">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input
              className="form-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electronico</label>
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
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="employee">Empleado</option>
            </select>
          </div>

          <button className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Creando...' : 'Crear usuario'}      
          </button>
        </form>
      </div>
    </>
  );
};

export default AdminCreateUser;
