import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { 
  createUser, 
  adminChangePasswordByEmail, 
  getCurrentUser, 
  getAllUsers, 
  deleteUser,
  // CORRECCIÓN: Importamos como 'type' para evitar el error de consola
  type User 
} from '../services/api';

const AdminCreateUser = () => {
  const currentUser = getCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Estados para el control de la interfaz
  const [showForm, setShowForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  
  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [loading, setLoading] = useState(false);

  // Cargar lista de usuarios al inicio
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Función principal para Crear o Editar
  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingEmail) {
        // MODO EDICIÓN: Solo actualiza la contraseña
        await adminChangePasswordByEmail(editingEmail, password);
        toast.success('Contraseña actualizada con éxito');
      } else {
        // MODO CREACIÓN: Crea usuario completo
        await createUser({ nombre, email, password, role });
        toast.success('Usuario creado correctamente');
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
    setNombre('');
    setEmail('');
    setPassword('');
    setRole('employee');
  };

  // ESTA ES LA FUNCIÓN QUE ABRE EL EDITOR
  const openEdit = (user: User) => {
    console.log("Editando usuario:", user.email); // Para que verifiques en consola
    setEditingEmail(user.email);
    setNombre(user.nombre);
    setEmail(user.email);
    setPassword(''); // Limpiamos el campo de password para la nueva
    setShowForm(true);
    
    // Subir al inicio para ver el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente a ${name}?`)) return;
    try {
      await deleteUser(id);
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (error) {
      toast.error('No se pudo eliminar el usuario');
    }
  };

  // Protección de ruta
  if (currentUser?.role !== 'admin') {
    return <div className="page-header"><h1>No tienes permisos de administrador</h1></div>;
  }

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Administración de Usuarios</h1>
          <p className="page-description">Gestiona los accesos y contraseñas del equipo</p>
        </div>
        <button 
          className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`} 
          onClick={() => showForm ? resetForm() : setShowForm(true)}
        >
          {showForm ? 'Cerrar Formulario' : 'Crear Nuevo Usuario'}
        </button>
      </div>

      {/* FORMULARIO DINÁMICO (CREAR / EDITAR) */}
      {showForm && (
        <div className="form-section shadow-lg border-primary/20 border">
          <h2 className="text-primary">
            {editingEmail ? `Restablecer contraseña de: ${nombre}` : 'Registrar nuevo usuario'}
          </h2>
          <form onSubmit={handleAction} className="mt-4">
            {!editingEmail && (
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
            )}
            {!editingEmail && (
              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">
                {editingEmail ? 'Nueva Contraseña' : 'Contraseña de acceso'}
              </label>
              <input 
                className="form-input" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6} 
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            {!editingEmail && (
              <div className="form-group">
                <label className="form-label">Rol del sistema</label>
                <select className="form-input" value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="employee">Empleado</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}
            <div className="flex gap-4 mt-6">
              <button className="btn btn-primary btn-lg flex-1" disabled={loading}>
                {loading ? 'Guardando...' : editingEmail ? 'Actualizar Contraseña' : 'Crear Usuario'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA DE USUARIOS */}
      <div className="list-container bg-white shadow-sm rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-700">Equipo Registrado</h2>
        </div>
        
        {loadingUsers ? (
          <div className="p-10 text-center text-gray-500">Cargando lista de usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="p-4 font-semibold">Nombre</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Rol</th>
                  <th className="p-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-none hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{u.nombre}</div>
                    </td>
                    <td className="p-4 text-gray-600">{u.email}</td>
                    <td className="p-4">
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                        {u.role === 'admin' ? 'Admin' : 'Empleado'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="btn btn-sm btn-outline" 
                          onClick={() => openEdit(u)} // <--- AQUÍ ESTÁ EL CLIC
                        >
                          Editar
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          disabled={u.id === currentUser.id} 
                          onClick={() => handleDelete(u.id, u.nombre)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCreateUser;