import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  createUser,
  adminChangePasswordByEmail,
  getCurrentUser,
  getAllUsers,
  deleteUser,
  subirFotoPerfilAPI,
  type User
} from '../services/api';

const AdminCreateUser = () => {
  // 1. OBTENER USUARIO
  const currentUser = getCurrentUser();
  const userDisplay = { nombre: currentUser?.nombre || 'Admin', rol: 'Administrador' };

  // 2. LÓGICA DE LA FOTO DE PERFIL
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "https://i.pravatar.cc/300?img=12");

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Previsualización local
    const localImageUrl = URL.createObjectURL(file);
    setAvatarUrl(localImageUrl);

    // Aquí irá tu conexión a la API en el futuro
    try {
      toast.loading('Subiendo foto...', { id: 'upload' });
      await subirFotoPerfilAPI(file);
      toast.success('Foto actualizada', { id: 'upload' });
    } catch (error) {
      toast.error('Error al subir foto', { id: 'upload' });
    }
  };

  // 3. ESTADOS DE GESTIÓN DE USUARIOS
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Estados de control
  const [showForm, setShowForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingEmail) {
        await adminChangePasswordByEmail(editingEmail, password);
        toast.success('Contraseña actualizada');
      } else {
        await createUser({ nombre, email, password, role });
        toast.success('Usuario creado');
      }
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error en la operación');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingEmail(null);
    setNombre(''); setEmail(''); setPassword(''); setRole('employee'); setShowPassword(false);
  };

  const openEdit = (user: User) => {
    setEditingEmail(user.email);
    setNombre(user.nombre);
    setEmail(user.email);
    setPassword('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar a ${name}?`)) return;
    try {
      await deleteUser(id);
      toast.success('Eliminado');
      fetchUsers();
    } catch (error) { toast.error('Error al eliminar'); }
  };

  if (currentUser?.role !== 'admin') {
    return <div style={{ padding: '40px', textAlign: 'center' }}>⛔ Acceso Denegado</div>;
  }

  return (
    <div className="app-container">

      {/* 1. PORTADA AZUL */}
      <div className="cover-header">
        <div style={{ color: 'white', fontSize: '2rem', fontWeight: 700, opacity: 0.9 }}>
          Gestión de Usuarios
        </div>
      </div>

      {/* 2. ESTRUCTURA PRINCIPAL */}
      <div className="dashboard-container">

        {/* --- COLUMNA IZQUIERDA (SIDEBAR) --- */}
        <div>
          <div className="card-box profile-card">

            {/* --- AVATAR EDITABLE --- */}
            <div
              className="profile-avatar editable-avatar"
              onClick={handleAvatarClick}
            >
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                className="profile-image"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
              <div className="avatar-overlay">
                📷 Cambiar
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>
            {/* ----------------------- */}

            <div className="profile-name">{userDisplay.nombre}</div>
            <div className="profile-role">{userDisplay.rol}</div>
          </div>

          <div className="card-box nav-card">
            <div className="nav-title">Menú Administrativo</div>
            <Link to="/dashboard" className="nav-link">📊 Dashboard General</Link>
            <Link to="/admin/dashboard" className="nav-link">📈 Estadísticas</Link>
            <Link to="/admin/usuarios" className="nav-link active">👤 Gestión de Usuarios</Link>
          </div>
        </div>

        {/* --- COLUMNA DERECHA (CONTENIDO) --- */}
        <div style={{ width: '100%' }}>

          {/* FORMULARIO (Solo aparece si showForm es true) */}
          {showForm && (
            <div className="card-box new-quote-card" style={{ marginBottom: '24px', animation: 'slideUp 0.3s ease' }}>
              <div className="section-title">
                <span>{editingEmail ? '🔒 Cambiar Contraseña' : '👤 Registrar Nuevo Usuario'}</span>
                <button className="action-btn" onClick={resetForm} title="Cerrar">✕</button>
              </div>

              <form onSubmit={handleAction} className="form-row">
                {!editingEmail && (
                  <div className="form-col">
                    <label className="form-label">Nombre</label>
                    <input className="input-field" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                  </div>
                )}
                {!editingEmail && (
                  <div className="form-col">
                    <label className="form-label">Email</label>
                    <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                )}
                <div className="form-col">
                  <label className="form-label">{editingEmail ? 'Nueva Contraseña' : 'Contraseña'}</label>
                  <div className="password-input-wrapper">
                    <input
                      className="input-field password-input"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      )}
                    </button>
                  </div>
                </div>
                {!editingEmail && (
                  <div className="form-col">
                    <label className="form-label">Rol</label>
                    <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as any)}>
                      <option value="employee">Empleado</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                )}
                <div className="form-col" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* LISTA DE USUARIOS */}
          <div className="card-box list-card">
            <div className="list-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Equipo Registrado</h3>
                <span className="badge-counter" style={{ background: '#eff6ff', color: '#2563eb', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem' }}>
                  {users.length}
                </span>
              </div>

              {!showForm && (
                <button
                  className="btn-primary"
                  onClick={() => setShowForm(true)}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  + Nuevo Usuario
                </button>
              )}
            </div>

            <div className="list-body">
              {loadingUsers ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Cargando usuarios...</div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="list-row">
                    <div className="quote-info">
                      <h4 style={{ fontSize: '1rem' }}>{u.nombre}</h4>
                      <div className="quote-meta"><span>{u.email}</span></div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase',
                        padding: '4px 10px', borderRadius: '20px',
                        background: u.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                        color: u.role === 'admin' ? '#2563eb' : '#64748b'
                      }}>
                        {u.role === 'admin' ? 'Admin' : 'Staff'}
                      </span>

                      <div className="quote-actions" style={{ display: 'flex', gap: '8px' }}>
                        <button className="action-btn" onClick={() => openEdit(u)} title="Editar">✏️</button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(u.id, u.nombre)}
                          disabled={u.id === currentUser?.id}
                          style={{ opacity: u.id === currentUser?.id ? 0.3 : 1, cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminCreateUser;