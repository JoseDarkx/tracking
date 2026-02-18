import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  listarCotizaciones,
  crearCotizacion,
  obtenerMetricas,
  construirUrlPublica,
  eliminarCotizacion,
  getCurrentUser,
  type Cotizacion,
  type MetricasDashboard,
  type PaginationInfo,
} from '../services/api';

const Dashboard = () => {
  // --- ESTADOS Y LÓGICA (Igual que antes) ---
  const [searchParams, setSearchParams] = useSearchParams();
  const usuarioFiltrado = searchParams.get('usuario');
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, cotizacionId: '', isLoading: false });

  const user = getCurrentUser();
  const userDisplay = { nombre: user?.nombre || 'Usuario', rol: user?.role === 'admin' ? 'Administrador' : 'Colaborador' };

  useEffect(() => { cargarDatos(); }, [pagination.page, usuarioFiltrado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [metricasData, cotizacionesResponse] = await Promise.all([
        obtenerMetricas(),
        listarCotizaciones(pagination.page, 10, usuarioFiltrado || undefined),
      ]);
      setMetricas(metricasData);
      setCotizaciones(cotizacionesResponse.data);
      setPagination(cotizacionesResponse.pagination);
    } catch (error) { toast.error('Error al cargar datos'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !pdfFile) return toast.error('Completa los campos');
    try {
      setUploading(true);
      const result = await crearCotizacion(codigo, pdfFile);
      navigator.clipboard.writeText(result.publicUrl);
      toast.success('¡Link creado y copiado!');
      setCodigo(''); setPdfFile(null);
      (document.getElementById('file-upload') as HTMLInputElement).value = '';
      setTimeout(() => cargarDatos(), 500);
    } catch (error) { toast.error('Error al crear'); } finally { setUploading(false); }
  };

  const handleEliminar = async () => {
    try {
      await eliminarCotizacion(deleteModal.cotizacionId);
      toast.success('Eliminado');
      setDeleteModal({ isOpen: false, cotizacionId: '', isLoading: false });
      cargarDatos();
    } catch { toast.error('Error al eliminar'); }
  };

  // --- RENDERIZADO VISUAL LIMPIO ---
  return (
    <div className="app-container">
      
      {/* 1. PORTADA AZUL */}
      <div className="cover-header">
      </div>

      {/* 2. GRID PRINCIPAL (IZQ: PERFIL | DER: CONTENIDO) */}
      <div className="dashboard-container">
        
        {/* --- COLUMNA IZQUIERDA --- */}
        <div className="sidebar-col">
          
          {/* Tarjeta de Perfil */}
          <div className="card-box profile-card">
            <div className="profile-avatar">{userDisplay.nombre.charAt(0)}</div>
            <div className="profile-name">{userDisplay.nombre}</div>
            <div className="profile-role">{userDisplay.rol}</div>
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-num">{metricas?.totalCotizaciones || 0}</span>
                <span className="stat-label">Cotizaciones</span>
              </div>
              <div className="stat-item">
                <span className="stat-num">{metricas?.totalVisitas || 0}</span>
                <span className="stat-label">Visitas</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de Menú */}
          <div className="card-box nav-card">
            <div className="nav-title">Menú Principal</div>
            <div className="nav-link active">📊 Dashboard</div>
            {user?.role === 'admin' && (
              <>
                <Link to="/admin/dashboard" className="nav-link">📈 Estadísticas Globales</Link>
                <Link to="/admin/usuarios" className="nav-link">👤 Gestión de Usuarios</Link>
              </>
            )}
          </div>
        </div>

        {/* --- COLUMNA DERECHA (MAIN) --- */}
        <div className="main-col">
          
          {/* Tarjetas de Métricas Superiores */}
          {metricas && (
            <div className="metrics-grid">
              <div className="card-box metric-card">
                <span className="metric-label">Total Cotizaciones</span>
                <span className="metric-value">{metricas.totalCotizaciones}</span>
              </div>
              <div className="card-box metric-card">
                <span className="metric-label" style={{color: '#2563eb'}}>Total Visitas</span>
                <span className="metric-value" style={{color: '#2563eb'}}>{metricas.totalVisitas}</span>
              </div>
              <div className="card-box metric-card">
                <span className="metric-label">Promedio</span>
                <span className="metric-value">{metricas.totalCotizaciones > 0 ? Math.round(metricas.totalVisitas/metricas.totalCotizaciones) : 0}</span>
              </div>
              <div className="card-box metric-card">
                <span className="metric-label" style={{color: '#f97316'}}>Más Vista</span>
                <span className="metric-value" style={{color: '#f97316'}}>{metricas.masVista || 0}</span>
              </div>
            </div>
          )}

          {/* Formulario Nueva Cotización */}
          <div className="card-box new-quote-card">
            <h3 className="section-title">🚀 Nueva Cotización</h3>
            <form onSubmit={handleSubmit} className="form-row">
              <div className="form-col">
                <label className="form-label">Código de Referencia</label>
                <input 
                  className="input-field" 
                  placeholder="Ej: COT-2026-001" 
                  value={codigo} onChange={(e) => setCodigo(e.target.value)} 
                />
              </div>
              <div className="form-col">
                <label className="form-label">Archivo PDF</label>
                <input 
                  type="file" id="file-upload" accept=".pdf" 
                  className="input-field file-field" 
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)} 
                />
              </div>
              <button type="submit" disabled={uploading || !codigo || !pdfFile} className="btn-primary">
                {uploading ? 'Subiendo...' : 'Generar Link ✨'}
              </button>
            </form>
          </div>

          {/* Lista de Cotizaciones */}
          <div className="card-box list-card">
            <div className="list-header">
              <h3>Cotizaciones Recientes</h3>
              <span style={{fontSize: '0.8rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px'}}>
                {cotizaciones.length} visibles
              </span>
            </div>
            
            <div className="list-body">
              {cotizaciones.length === 0 ? (
                <div style={{padding: '40px', textAlign: 'center', color: '#94a3b8'}}>No hay cotizaciones aún</div>
              ) : (
                cotizaciones.map((cot) => (
                  <div key={cot.id} className="list-row">
                    <div className="quote-info">
                      <h4>{cot.codigo} {cot.asesor && <small style={{fontWeight:400, color:'#64748b'}}>👤 {cot.asesor.nombre}</small>}</h4>
                      <div className="quote-meta">
                        <span>📅 {new Date(cot.created_at).toLocaleDateString()}</span>
                        <a href={construirUrlPublica(cot.slug)} target="_blank" className="quote-link">
                          {construirUrlPublica(cot.slug)}
                        </a>
                      </div>
                    </div>
                    
                    <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>{cot.total_visitas}</div>
                        <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>VISITAS</div>
                      </div>
                      <div style={{display:'flex', gap:'8px'}}>
                        <button className="action-btn" title="Ver" onClick={()=>window.open(construirUrlPublica(cot.slug))}>👁️</button>
                        <button className="action-btn" title="Copiar" onClick={()=>{navigator.clipboard.writeText(construirUrlPublica(cot.slug)); toast.success('Copiado');}}>📋</button>
                        <button className="action-btn delete" title="Eliminar" onClick={()=>{setDeleteModal({isOpen:true, cotizacionId:String(cot.id), isLoading:false})}}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Paginación simple */}
            {pagination.pages > 1 && (
              <div style={{padding:'16px', display:'flex', justifyContent:'center', gap:'10px'}}>
                <button className="action-btn" disabled={pagination.page===1} onClick={()=>setPagination(p=>({...p, page:p.page-1}))}>←</button>
                <span style={{alignSelf:'center', fontSize:'0.9rem'}}>Página {pagination.page}</span>
                <button className="action-btn" disabled={pagination.page===pagination.pages} onClick={()=>setPagination(p=>({...p, page:p.page+1}))}>→</button>
              </div>
            )}
          </div>

        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        title="Eliminar cotización"
        message="¿Seguro que deseas eliminar?"
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        isDangerous={true}
        onConfirm={handleEliminar}
        onCancel={()=>setDeleteModal({isOpen:false, cotizacionId:'', isLoading:false})}
      />
    </div>
  );
};

export default Dashboard;