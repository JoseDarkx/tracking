import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
   PieChart, Pie, Legend
} from 'recharts';
import { obtenerEstadisticasEmpleados, obtenerTopCotizaciones, getCurrentUser, subirFotoPerfilAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Componente de panel de administración.
 * Visualiza estadísticas globales del equipo, rendimiento de asesores y tráfico de cotizaciones.
 */
const AdminDashboard = () => {
   const navigate = useNavigate();
   const [data, setData] = useState<Array<{ id: string; nombre: string; cotizaciones: number; ganadas: number; perdidas: number }>>([]);
   const [donutData, setDonutData] = useState<Array<{ name: string; value: number }>>([]);
   const [loading, setLoading] = useState(true);

   // 1. OBTENER USUARIO
   const user = getCurrentUser();
   const userDisplay = { nombre: user?.nombre || 'Admin', rol: 'Administrador' };

   // 2. LÓGICA DE LA FOTO DE PERFIL
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "https://i.pravatar.cc/300?img=12");

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
         toast.error('Error al subir', { id: 'upload' });
      }
   };

   // 3. CARGA DE DATOS ESTADÍSTICOS
   useEffect(() => {
      const fetchData = async () => {
         try {
            const [statsEmpleados, statsVistas] = await Promise.all([
               obtenerEstadisticasEmpleados(),
               obtenerTopCotizaciones()
            ]);
            setData(statsEmpleados);
            setDonutData(statsVistas);
         } catch (error) {
            toast.error('Error al cargar estadísticas');
            console.error(error);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, []);

   const handleBarClick = (data: any) => {
      if (data && data.activePayload && data.activePayload.length > 0) {
         const empleadoId = data.activePayload[0].payload.id;
         const nombre = data.activePayload[0].payload.nombre;
         navigate(`/dashboard?usuario=${empleadoId}`);
         toast.success(`Filtrando por: ${nombre}`);
      }
   };

   const donutColors = ['#0ea5e9', '#2563eb', '#64748b', '#94a3b8', '#334155'];

   return (
      <div className="app-container">

         {/* 1. PORTADA AZUL */}
         <div className="cover-header">
            <div style={{ color: 'white', fontSize: '2rem', fontWeight: 700, opacity: 0.9 }}>
               Estadísticas Globales
            </div>
         </div>

         {/* 2. GRID PRINCIPAL */}
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
                  <div className="nav-title">Menú Principal</div>
                  <Link to="/dashboard" className="nav-link active">📊 Dashboard</Link>

                  {/* ✅ Visible para TODOS — empleados y admins */}
                  <Link to="/cotizaciones/cerradas" className="nav-link">📁 Cotizaciones Cerradas</Link>

                  {user?.role === 'admin' && (
                     <>
                        <Link to="/admin/dashboard" className="nav-link">📈 Estadísticas Globales</Link>
                        <Link to="/admin/usuarios" className="nav-link">👤 Gestión de Usuarios</Link>
                     </>
                  )}
               </div>
            </div>

            {/* --- COLUMNA DERECHA (GRÁFICOS) --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>

               {loading ? (
                  <div className="card-box" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                     Cargando métricas en tiempo real...
                  </div>
               ) : (
                  <>
                     {/* GRÁFICO PRINCIPAL: BARRAS */}
                     <div className="card-box" style={{ padding: '24px' }}>
                        <div className="section-title" style={{ justifyContent: 'space-between' }}>
                           <span>Rendimiento de Equipo</span>
                           <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
                              🖱️ Click en una barra para ver detalles
                           </span>
                        </div>

                        <div style={{ width: '100%', height: 400 }}>
                           <ResponsiveContainer>
                              <BarChart data={data} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                 <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                 <Tooltip
                                    cursor={{ fill: '#eff6ff' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                 />
                                 <Bar dataKey="ganadas" stackId="a" fill="#22c55e" name="Ganadas" barSize={50} />
                                 <Bar dataKey="perdidas" stackId="a" fill="#ef4444" name="Perdidas" barSize={50} radius={[6, 6, 0, 0]} />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                     {/* FILA INFERIOR: RANKING Y DONA */}
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                        {/* Ranking List */}
                        <div className="card-box list-card">
                           <div className="list-header">
                              <h3>🏆 Top Asesores</h3>
                           </div>
                           <div>
                              {data.length === 0 ? (
                                 <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Sin datos aún</div>
                              ) : (
                                 data.sort((a, b) => b.cotizaciones - a.cotizaciones).slice(0, 5).map((emp, i) => (
                                    <div
                                       key={emp.id}
                                       className="list-row"
                                       onClick={() => navigate(`/dashboard?usuario=${emp.id}`)}
                                       style={{ cursor: 'pointer' }}
                                    >
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                          <div style={{
                                             width: '32px', height: '32px', borderRadius: '8px',
                                             background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#fb923c' : '#f1f5f9',
                                             color: i < 3 ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700'
                                          }}>
                                             {i + 1}
                                          </div>
                                          <div style={{ fontWeight: 600, color: '#334155' }}>{emp.nombre}</div>
                                       </div>
                                       <div style={{ textAlign: 'right' }}>
                                          <span style={{ display: 'block', fontWeight: 'bold', color: '#2563eb', fontSize: '1.1rem' }}>{emp.cotizaciones}</span>
                                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Cots</span>
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>

                        {/* Gráfico de Dona */}
                        <div className="card-box" style={{ padding: '24px' }}>
                           <h3 className="section-title">Tráfico por Cotización</h3>
                           {donutData.length > 0 ? (
                              <div style={{ width: '100%', height: 300 }}>
                                 <ResponsiveContainer>
                                    <PieChart>
                                       <Pie
                                          data={donutData}
                                          innerRadius={60}
                                          outerRadius={90}
                                          paddingAngle={5}
                                          dataKey="value"
                                       >
                                          {donutData.map((_, index) => (
                                             <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                                          ))}
                                       </Pie>
                                       <Tooltip />
                                       <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                 </ResponsiveContainer>
                              </div>
                           ) : (
                              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '10px' }}>
                                 <span style={{ fontSize: '2rem' }}>📉</span>
                                 <p>No hay visitas registradas todavía</p>
                              </div>
                           )}
                        </div>
                     </div>
                  </>
               )}
            </div>

         </div>
      </div>
   );
};

export default AdminDashboard;