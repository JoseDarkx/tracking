import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
   PieChart, Pie, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { obtenerEstadisticasEmpleados, obtenerTopCotizaciones, getCurrentUser, subirFotoPerfilAPI, obtenerReporteCotizaciones } from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
   const navigate = useNavigate();
   const [data, setData] = useState<Array<{ id: string; nombre: string; cotizaciones: number; ganadas: number; perdidas: number }>>([]);
   const [donutData, setDonutData] = useState<Array<{ name: string; value: number }>>([]);
   const [loading, setLoading] = useState(true);
   const [downloading, setDownloading] = useState(false);
   const [mesSeleccionado, setMesSeleccionado] = useState<number>(new Date().getMonth() + 1);
   const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear());

   const user = getCurrentUser();
   const userDisplay = { nombre: user?.nombre || 'Admin', rol: 'Administrador' };

   const fileInputRef = useRef<HTMLInputElement>(null);
   const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "https://i.pravatar.cc/300?img=12");

   const handleAvatarClick = () => fileInputRef.current?.click();

   const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAvatarUrl(URL.createObjectURL(file));
      try {
         toast.loading('Subiendo foto...', { id: 'upload' });
         await subirFotoPerfilAPI(file);
         toast.success('Foto actualizada', { id: 'upload' });
      } catch {
         toast.error('Error al subir', { id: 'upload' });
      }
   };

   useEffect(() => {
      const fetchData = async () => {
         try {
            const [statsEmpleados, statsVistas] = await Promise.all([
               obtenerEstadisticasEmpleados(),
               obtenerTopCotizaciones()
            ]);
            setData(statsEmpleados);
            setDonutData(statsVistas);
         } catch {
            toast.error('Error al cargar estadísticas');
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, []);

   const handleDownloadExcel = async () => {
      setDownloading(true);
      try {
         const cotizaciones = await obtenerReporteCotizaciones(mesSeleccionado, anioSeleccionado);

         if (cotizaciones.length === 0) {
            toast('No hay cotizaciones en ese período.', { icon: '⚠️' });
            return;
         }

         const nombresMeses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
         const etiquetaMes = nombresMeses[mesSeleccionado - 1];

         const filas = cotizaciones.map((c) => ({
            'Código': c.codigo,
            'Asesor': c.asesor_nombre,
            'Email Asesor': c.asesor_email || '-',
            'Estado': c.estado.charAt(0).toUpperCase() + c.estado.slice(1),
            'Valor ($)': c.valor ?? '-',
            'Visitas': c.total_visitas,
            'Fecha': new Date(c.created_at).toLocaleDateString('es-CO', {
               year: 'numeric', month: '2-digit', day: '2-digit'
            }),
         }));

         const ws = XLSX.utils.json_to_sheet(filas);
         ws['!cols'] = [
            { wch: 20 }, // Código
            { wch: 25 }, // Asesor
            { wch: 30 }, // Email
            { wch: 12 }, // Estado
            { wch: 14 }, // Valor
            { wch: 10 }, // Visitas
            { wch: 14 }, // Fecha
         ];

         const wb = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
         XLSX.writeFile(wb, `reporte-${etiquetaMes}-${anioSeleccionado}.xlsx`);
         toast.success(`¡${filas.length} cotizaciones exportadas (${etiquetaMes} ${anioSeleccionado})!`);
      } catch {
         toast.error('Error al generar el reporte');
      } finally {
         setDownloading(false);
      }
   };

   const handleBarClick = (data: any) => {
      if (data?.activePayload?.length > 0) {
         const empleadoId = data.activePayload[0].payload.id;
         const nombre = data.activePayload[0].payload.nombre;
         navigate(`/dashboard?usuario=${empleadoId}`);
         toast.success(`Filtrando por: ${nombre}`);
      }
   };

   // Normalizar a 100% para que todas las barras sean igual de altas
   const chartData = data.map(emp => {
      const total = emp.cotizaciones || 1; // evitar división por 0
      const pendientes = Math.max(0, emp.cotizaciones - emp.ganadas - emp.perdidas);
      return {
         ...emp,
         pendientes,
         // Valores en porcentaje para el gráfico
         ganadasPct: Math.round((emp.ganadas / total) * 100),
         perdidasPct: Math.round((emp.perdidas / total) * 100),
         pendientesPct: Math.round((pendientes / total) * 100),
      };
   });

   // Tooltip personalizado
   const CustomTooltip = ({ active, payload }: any) => {
      if (!active || !payload?.length) return null;
      const d = payload[0].payload;
      const tasaCierre = d.cotizaciones > 0
         ? Math.round(((d.ganadas + d.perdidas) / d.cotizaciones) * 100)
         : 0;

      return (
         <div style={{
            background: 'white', borderRadius: '14px', padding: '14px 18px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0',
            minWidth: '180px',
         }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '10px', fontSize: '0.95rem' }}>
               {d.nombre}
            </div>

            {/* Barra de progreso mini */}
            <div style={{ marginBottom: '10px' }}>
               <div style={{ height: 6, borderRadius: 20, background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${d.cotizaciones > 0 ? (d.ganadas / d.cotizaciones) * 100 : 0}%`, background: '#22c55e', transition: 'width 0.3s' }} />
                  <div style={{ width: `${d.cotizaciones > 0 ? (d.perdidas / d.cotizaciones) * 100 : 0}%`, background: '#ef4444', transition: 'width 0.3s' }} />
               </div>
               <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 3 }}>
                  Tasa de cierre: {tasaCierre}%
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.82rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                  <span style={{ color: '#64748b' }}>📋 Total cotizaciones</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{d.cotizaciones}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                  <span style={{ color: '#16a34a' }}>✅ Ganadas</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>{d.ganadas}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                  <span style={{ color: '#dc2626' }}>❌ Perdidas</span>
                  <span style={{ fontWeight: 700, color: '#dc2626' }}>{d.perdidas}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: 5 }}>
                  <span style={{ color: '#94a3b8' }}>⏳ Pendientes</span>
                  <span style={{ fontWeight: 700, color: '#94a3b8' }}>{d.pendientes}</span>
               </div>
            </div>
         </div>
      );
   };

   const donutColors = ['#0ea5e9', '#2563eb', '#64748b', '#94a3b8', '#334155'];

   return (
      <div className="app-container">
         <div className="cover-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
               <div style={{ color: 'white', fontSize: '2rem', fontWeight: 700, opacity: 0.9 }}>
                  Estadísticas Globales
               </div>

               {/* Controles de descarga */}
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

                  {/* Selector de Mes */}
                  <select
                     id="select-mes-reporte"
                     value={mesSeleccionado}
                     onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                     style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        borderRadius: '10px',
                        padding: '9px 12px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                     }}
                  >
                     {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                        <option key={i + 1} value={i + 1} style={{ background: '#1e293b', color: 'white' }}>{m}</option>
                     ))}
                  </select>

                  {/* Selector de Año */}
                  <select
                     id="select-anio-reporte"
                     value={anioSeleccionado}
                     onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                     style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        borderRadius: '10px',
                        padding: '9px 12px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                     }}
                  >
                     {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(y => (
                        <option key={y} value={y} style={{ background: '#1e293b', color: 'white' }}>{y}</option>
                     ))}
                  </select>

                  {/* Botón descargar */}
                  <button
                     id="btn-descargar-excel"
                     onClick={handleDownloadExcel}
                     disabled={downloading}
                     style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: downloading ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: downloading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                        opacity: downloading ? 0.7 : 1,
                     }}
                     onMouseEnter={(e) => { if (!downloading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.3)'; }}
                     onMouseLeave={(e) => { if (!downloading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
                  >
                     {downloading ? (
                        <>
                           <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                           Generando...
                        </>
                     ) : (
                        <>
                           📊 Descargar Excel
                        </>
                     )}
                  </button>

               </div>
            </div>
         </div>

         <div className="dashboard-container">
            {/* SIDEBAR */}
            <div>
               <div className="card-box profile-card">
                  <div className="profile-avatar editable-avatar" onClick={handleAvatarClick}>
                     <img src={avatarUrl} alt="Foto de perfil" className="profile-image"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                     <div className="avatar-overlay">📷 Cambiar</div>
                     <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                  </div>
                  <div className="profile-name">{userDisplay.nombre}</div>
                  <div className="profile-role">{userDisplay.rol}</div>
               </div>

               <div className="card-box nav-card">
                  <div className="nav-title">Menú Principal</div>
                  <Link to="/dashboard" className="nav-link active">📊 Dashboard</Link>
                  <Link to="/cotizaciones/cerradas" className="nav-link">📁 Cotizaciones Cerradas</Link>
                  {user?.role === 'admin' && (
                     <>
                        <Link to="/admin/dashboard" className="nav-link">📈 Estadísticas Globales</Link>
                        <Link to="/admin/usuarios" className="nav-link">👤 Gestión de Usuarios</Link>
                     </>
                  )}
               </div>
            </div>

            {/* CONTENIDO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
               {loading ? (
                  <div className="card-box" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                     Cargando métricas en tiempo real...
                  </div>
               ) : (
                  <>
                     {/* GRÁFICO BARRAS */}
                     <div className="card-box" style={{ padding: '24px' }}>
                        <div className="section-title" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                           <span>Rendimiento de Equipo</span>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Leyenda */}
                              <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} /> Ganadas
                                 </span>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} /> Perdidas
                                 </span>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 3, background: '#e2e8f0', display: 'inline-block' }} /> Pendientes
                                 </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
                                 🖱️ Click en una barra para ver detalles
                              </span>
                           </div>
                        </div>

                        <div style={{ width: '100%', height: 400 }}>
                           <ResponsiveContainer>
                              <BarChart data={chartData} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                 <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                 <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                 <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                                 {/* Ganadas — verde, abajo */}
                                 <Bar dataKey="ganadasPct" stackId="a" fill="#22c55e" name="Ganadas" barSize={50} />
                                 {/* Perdidas — rojo, encima */}
                                 <Bar dataKey="perdidasPct" stackId="a" fill="#ef4444" name="Perdidas" barSize={50} />
                                 {/* Pendientes — gris, arriba de todo */}
                                 <Bar dataKey="pendientesPct" stackId="a" fill="#e2e8f0" name="Pendientes" barSize={50} radius={[6, 6, 0, 0]} />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                     {/* FILA INFERIOR */}
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                        {/* Ranking */}
                        <div className="card-box list-card">
                           <div className="list-header">
                              <h3>🏆 Top Asesores</h3>
                           </div>
                           <div>
                              {data.length === 0 ? (
                                 <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Sin datos aún</div>
                              ) : (
                                 data.sort((a, b) => b.cotizaciones - a.cotizaciones).slice(0, 5).map((emp, i) => (
                                    <div key={emp.id} className="list-row" onClick={() => navigate(`/dashboard?usuario=${emp.id}`)} style={{ cursor: 'pointer' }}>
                                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                          <div style={{
                                             width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                                             background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#fb923c' : '#f1f5f9',
                                             color: i < 3 ? 'white' : '#64748b',
                                             display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700'
                                          }}>
                                             {i + 1}
                                          </div>
                                          <div style={{ flex: 1 }}>
                                             <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{emp.nombre}</div>
                                             {/* Mini barra de cierre */}
                                             <div style={{ marginTop: 4, height: 4, borderRadius: 20, background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                                                <div style={{ width: `${emp.cotizaciones > 0 ? (emp.ganadas / emp.cotizaciones) * 100 : 0}%`, background: '#22c55e' }} />
                                                <div style={{ width: `${emp.cotizaciones > 0 ? (emp.perdidas / emp.cotizaciones) * 100 : 0}%`, background: '#ef4444' }} />
                                             </div>
                                          </div>
                                       </div>
                                       <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                          <span style={{ display: 'block', fontWeight: 'bold', color: '#2563eb', fontSize: '1.1rem' }}>{emp.cotizaciones}</span>
                                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Cots</span>
                                       </div>
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>

                        {/* Dona */}
                        <div className="card-box" style={{ padding: '24px' }}>
                           <h3 className="section-title">Tráfico por Cotización</h3>
                           {donutData.length > 0 ? (
                              <div style={{ width: '100%', height: 300 }}>
                                 <ResponsiveContainer>
                                    <PieChart>
                                       <Pie data={donutData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
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