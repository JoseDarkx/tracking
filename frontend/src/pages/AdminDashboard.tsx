import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { obtenerEstadisticasEmpleados, obtenerTopCotizaciones, getCurrentUser } from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Array<{ id: string; nombre: string; cotizaciones: number }>>([]);
  const [donutData, setDonutData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  const user = getCurrentUser();
  const userDisplay = { nombre: user?.nombre || 'Admin', rol: 'Administrador' };

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

  const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
  const donutColors = ['#0ea5e9', '#2563eb', '#64748b', '#94a3b8', '#334155'];

  return (
    <div className="app-container">
      
      {/* 1. PORTADA AZUL */}
      <div className="cover-header">
        <div style={{color: 'white', fontSize: '2rem', fontWeight: 700, opacity: 0.9}}>
           Estadísticas Globales
        </div>
      </div>

      {/* 2. GRID PRINCIPAL */}
      <div className="dashboard-container">

        {/* --- COLUMNA IZQUIERDA (SIDEBAR) --- */}
        <div>
          <div className="card-box profile-card">
            <div className="profile-avatar">{userDisplay.nombre.charAt(0)}</div>
            <div className="profile-name">{userDisplay.nombre}</div>
            <div className="profile-role">{userDisplay.rol}</div>
          </div>

          <div className="card-box nav-card">
            <div className="nav-title">Menú Administrativo</div>
            <Link to="/dashboard" className="nav-link">📊 Dashboard General</Link>
            <Link to="/admin/dashboard" className="nav-link active">📈 Estadísticas</Link>
            <Link to="/admin/usuarios" className="nav-link">👤 Gestión de Usuarios</Link>
          </div>
        </div>

        {/* --- COLUMNA DERECHA (GRÁFICOS) --- */}
        {/* 👇 AQUÍ ESTÁ EL ARREGLO: width: '100%' 👇 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
            
            {loading ? (
               <div className="card-box" style={{padding: '40px', textAlign: 'center', color:'#94a3b8'}}>
                  Cargando métricas en tiempo real...
               </div>
            ) : (
               <>
                 {/* GRÁFICO PRINCIPAL: BARRAS */}
                 <div className="card-box" style={{ padding: '24px' }}>
                    <div className="section-title" style={{justifyContent: 'space-between'}}>
                        <span>Rendimiento de Equipo</span>
                        <span style={{fontSize:'0.75rem', fontWeight:'normal', color:'#64748b', background:'#f1f5f9', padding:'4px 10px', borderRadius:'20px'}}>
                           🖱️ Click en una barra para ver detalles
                        </span>
                    </div>
                    
                    <div style={{ width: '100%', height: 400 }}>
                       <ResponsiveContainer>
                          <BarChart data={data} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                             <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                             <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                             <Tooltip 
                                cursor={{ fill: '#eff6ff' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                             />
                             <Bar dataKey="cotizaciones" radius={[6, 6, 0, 0]} barSize={50}>
                                {data.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                             </Bar>
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
                             <div style={{padding:'20px', textAlign:'center', color:'#94a3b8'}}>Sin datos aún</div>
                          ) : (
                             data.sort((a,b) => b.cotizaciones - a.cotizaciones).slice(0, 5).map((emp, i) => (
                                <div 
                                   key={emp.id} 
                                   className="list-row" 
                                   onClick={() => navigate(`/dashboard?usuario=${emp.id}`)}
                                   style={{cursor: 'pointer'}}
                                >
                                   <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                      <div style={{
                                         width:'32px', height:'32px', borderRadius:'8px', 
                                         background: i===0?'#fbbf24':i===1?'#94a3b8':i===2?'#fb923c':'#f1f5f9',
                                         color: i<3?'white':'#64748b', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700'
                                      }}>
                                         {i+1}
                                      </div>
                                      <div style={{fontWeight:600, color:'#334155'}}>{emp.nombre}</div>
                                   </div>
                                   <div style={{textAlign:'right'}}>
                                      <span style={{display:'block', fontWeight:'bold', color:'#2563eb', fontSize:'1.1rem'}}>{emp.cotizaciones}</span>
                                      <span style={{fontSize:'0.65rem', color:'#94a3b8', textTransform:'uppercase'}}>Cots</span>
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
                                   <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                             </ResponsiveContainer>
                          </div>
                       ) : (
                          <div style={{height:'300px', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', flexDirection:'column', gap:'10px'}}>
                             <span style={{fontSize:'2rem'}}>📉</span>
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