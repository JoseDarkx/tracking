import { useEffect, useState, useRef } from 'react';
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
  subirFotoPerfilAPI,
  cambiarEstadoCotizacion,
  type Cotizacion,
  type MetricasDashboard,
  type PaginationInfo,
} from '../services/api';

/**
 * Panel principal del asesor y administrador (vista de colaborador).
 * Permite crear cotizaciones, ver el listado personal y gestionar el estado de las mismas.
 */
const Dashboard = () => {
  const currentUser = getCurrentUser();
  const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
  const userDisplay = {
    nombre: currentUser?.nombre || 'Usuario',
    rol: currentUser?.role === 'admin' ? 'Administrador' : 'Colaborador'
  };

  const [searchParams,] = useSearchParams();
  const usuarioFiltrado = searchParams.get('usuario');
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [_loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "https://i.pravatar.cc/300?img=12");

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

  const [codigo, setCodigo] = useState('');
  const [valor, setValor] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, cotizacionId: '', isLoading: false });

  // ✨ SWEEP STATE
  const [sweepState, setSweepState] = useState<{
    id: number;
    estado: string;
    phase: 'confirming' | 'sweeping' | 'swept' | 'collapsing';
  } | null>(null);

  // 🌳 CASCADE STATE — Set de IDs de grupos colapsados (por defecto todos expandidos)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLDivElement>(null);

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
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // 🌳 Agrupa cotizaciones por primera palabra compartida
  const agruparCotizaciones = (lista: Cotizacion[]) => {
    const visibles = lista.filter(cot => {
      const e = String(cot.estado || '').toLowerCase().trim();
      return (e !== 'ganada' && e !== 'perdida') || sweepState?.id === cot.id;
    });

    // Obtiene la primera palabra de un código (en mayúsculas)
    const primeraWord = (code: string) => code.trim().toUpperCase().split(/\s+/)[0];

    // Agrupar por primera palabra
    const porPrimeraWord = new Map<string, Cotizacion[]>();
    for (const cot of visibles) {
      const key = primeraWord(cot.codigo);
      if (!porPrimeraWord.has(key)) porPrimeraWord.set(key, []);
      porPrimeraWord.get(key)!.push(cot);
    }

    type Grupo = { parent: Cotizacion; children: Cotizacion[] };
    const grupos: Grupo[] = [];

    for (const members of porPrimeraWord.values()) {
      // Ordenar: el más corto (nombre base) queda como padre; si igual longitud, alfabético
      members.sort((a, b) =>
        a.codigo.length - b.codigo.length || a.codigo.localeCompare(b.codigo)
      );
      if (members.length === 1) {
        grupos.push({ parent: members[0], children: [] });
      } else {
        grupos.push({ parent: members[0], children: members.slice(1) });
      }
    }

    // Ordenar grupos por la fecha de la cotización más reciente dentro del grupo
    grupos.sort((a, b) => {
      const getLatestDate = (g: Grupo) => {
        const dates = [new Date(g.parent.created_at).getTime(), ...g.children.map(c => new Date(c.created_at).getTime())];
        return Math.max(...dates);
      };
      return getLatestDate(b) - getLatestDate(a);
    });

    return grupos;
  };

  // 🌳 Toggle colapsar/expandir grupo
  const toggleGroup = (parentId: number) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) { next.delete(parentId); } else { next.add(parentId); }
      return next;
    });
  };

  // ➕ Pre-rellenar formulario con nombre base para crear variante
  const handleCrearVariante = (codigoBase: string) => {
    setCodigo(codigoBase + ' ');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Enfocar el input
      const input = formRef.current?.querySelector('input[type="text"], input:not([type])') as HTMLInputElement | null;
      input?.focus();
      // Mover cursor al final
      if (input) { const len = input.value.length; input.setSelectionRange(len, len); }
    }, 100);
    toast.success('Escribe el sufijo para la variante (ej: V2, REVISIÓN...)', { duration: 3000, icon: '✏️' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !pdfFile) return toast.error('Completa los campos');

    // Validación: solo permitir letras, números, espacios, guiones y guiones bajos (evita emojis)
    const regexCodigo = /^[a-zA-Z0-9\s\-_ñÑáéíóúÁÉÍÓÚ]+$/;
    if (!regexCodigo.test(codigo)) {
      return toast.error('El código de referencia contiene caracteres no permitidos o emojis');
    }

    try {
      setUploading(true);
      const valorNum = valor.trim() !== '' ? parseInt(valor.replace(/[^0-9]/g, ''), 10) : undefined;
      const result = await crearCotizacion(codigo, pdfFile, valorNum);
      navigator.clipboard.writeText(result.publicUrl);
      toast.success('¡Link creado y copiado!');
      setCodigo(''); setPdfFile(null); setValor('');
      (document.getElementById('file-upload') as HTMLInputElement).value = '';
      setTimeout(() => cargarDatos(), 500);
    } catch {
      toast.error('Error al crear');
    } finally {
      setUploading(false);
    }
  };

  const handleEliminar = async () => {
    try {
      await eliminarCotizacion(deleteModal.cotizacionId);
      toast.success('Eliminado');
      setDeleteModal({ isOpen: false, cotizacionId: '', isLoading: false });
      cargarDatos();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // ✨ PASO 1: mostrar confirmación
  const handleEstadoChange = (cotizacionId: number, nuevoEstado: string) => {
    if (sweepState) return;
    setSweepState({ id: cotizacionId, estado: nuevoEstado, phase: 'confirming' });
  };

  // ✨ PASO 2: confirmar → sweep + API
  const handleConfirmar = async () => {
    if (!sweepState || sweepState.phase !== 'confirming') return;
    const { id: cotizacionId, estado: nuevoEstado } = sweepState;

    setSweepState({ id: cotizacionId, estado: nuevoEstado, phase: 'sweeping' });

    try {
      await cambiarEstadoCotizacion(String(cotizacionId), nuevoEstado);
      setTimeout(() => setSweepState({ id: cotizacionId, estado: nuevoEstado, phase: 'swept' }), 450);
      setTimeout(() => setSweepState({ id: cotizacionId, estado: nuevoEstado, phase: 'collapsing' }), 850);
      setTimeout(() => {
        setCotizaciones(prev => prev.filter(c => c.id !== cotizacionId));
        setSweepState(null);
        toast.success(nuevoEstado === 'ganada' ? '¡Excelente cierre! 🎉' : 'Registrado', {
          style: { background: nuevoEstado === 'ganada' ? '#22c55e' : '#ef4444', color: '#fff', fontWeight: 'bold' },
        });
      }, 1200);
    } catch {
      toast.error('Error al cambiar el estado');
      setSweepState(null);
    }
  };

  // ✨ CANCELAR
  const handleCancelar = () => setSweepState(null);

  const getBadgeStyle = (estado?: string) => {
    switch (String(estado || '').toLowerCase().trim()) {
      case 'ganada': return { bg: '#dcfce7', color: '#166534' };
      case 'perdida': return { bg: '#fee2e2', color: '#991b1b' };
      default: return { bg: '#fef3c7', color: '#d97706' };
    }
  };

  // 🌳 Renderiza una fila (padre o hijo)
  const renderRow = (cot: Cotizacion, isChild: boolean, hasChildren: boolean, isExpanded: boolean) => {
    const s = sweepState?.id === cot.id ? sweepState : null;
    const bloqueada = sweepState !== null && sweepState.id !== cot.id;

    return (
      <div
        key={cot.id}
        className={`list-row ${s?.phase === 'collapsing' ? 'collapsing' : ''}`}
        style={{
          pointerEvents: bloqueada || (s && s.phase !== 'confirming') ? 'none' : 'auto',
          opacity: bloqueada ? 0.5 : 1,
          transition: 'opacity 0.2s ease',
          marginLeft: isChild ? '28px' : 0,
          borderLeft: isChild ? '2px solid #cbd5e1' : undefined,
          borderRadius: isChild ? '0 8px 8px 0' : undefined,
          position: 'relative',
        }}
      >
        {/* Barra sweep */}
        <div className={`sweep-bar ${s?.estado || ''} ${s && s.phase !== 'confirming' ? 'active' : ''}`} />

        {/* Resultado */}
        <div className={`sweep-result ${s?.phase === 'swept' || s?.phase === 'collapsing' ? 'visible' : ''}`}>
          {s?.estado === 'ganada' ? '✅  GANADA' : s?.estado === 'perdida' ? '❌  PERDIDA' : ''}
        </div>

        {/* Overlay confirmación */}
        {s?.phase === 'confirming' && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', inset: 0, zIndex: 10,
              pointerEvents: 'all',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 24px',
              background: s.estado === 'ganada'
                ? 'linear-gradient(90deg, #f0fdf4, #dcfce7)'
                : 'linear-gradient(90deg, #fff1f2, #fee2e2)',
              animation: 'confirmIn 0.2s ease',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: s.estado === 'ganada' ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {s.estado === 'ganada' ? '✅' : '❌'}
              ¿Marcar como <strong>{s.estado}</strong>?
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={(e) => { e.stopPropagation(); handleConfirmar(); }} style={{ padding: '7px 18px', border: 'none', borderRadius: '8px', background: s.estado === 'ganada' ? '#16a34a' : '#dc2626', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Confirmar
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleCancelar(); }} style={{ padding: '7px 18px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Contenido normal */}
        <div className={`sweep-content ${s?.phase === 'swept' || s?.phase === 'collapsing' ? 'hidden' : ''}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>

              {/* ▼/▶ Toggle expand/collapse (solo padre con hijos) */}
              {hasChildren && (
                <button
                  onClick={() => toggleGroup(cot.id)}
                  title={isExpanded ? 'Colapsar variantes' : 'Expandir variantes'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#64748b', padding: '0 2px', flexShrink: 0, lineHeight: 1, fontWeight: 700 }}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}

              {/* Ícono hijo */}
              {isChild && (
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', flexShrink: 0, marginRight: '2px' }}>└</span>
              )}

              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0 }}>
                {cot.codigo}
              </h4>

              <span style={{ backgroundColor: getBadgeStyle(cot.estado).bg, color: getBadgeStyle(cot.estado).color, borderRadius: '12px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {String(cot.estado || 'pendiente')}
              </span>

              {cot.valor != null && (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', marginLeft: '4px' }}>
                  {formatCOP(cot.valor)}
                </span>
              )}

              {cot.asesor && (
                <small style={{ color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  👤 {cot.asesor.nombre}
                </small>
              )}

              <div className="row-hover-actions" style={{ flexShrink: 0 }}>
                <button className="btn-ganada" onClick={() => handleEstadoChange(cot.id, 'ganada')}>✓ Ganada</button>
                <button className="btn-perdida" onClick={() => handleEstadoChange(cot.id, 'perdida')}>✗ Perdida</button>
              </div>
            </div>

            <div className="quote-meta">
              <span>📅 {new Date(cot.created_at).toLocaleDateString()}</span>
              <a href={construirUrlPublica(cot.slug)} target="_blank" rel="noopener noreferrer" className="quote-link">
                {construirUrlPublica(cot.slug)}
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ textAlign: 'center', minWidth: '44px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{cot.total_visitas}</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>visitas</div>
            </div>

            <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }} />

            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {/* ➕ Botón Crear Variante */}
              <button
                title="Crear variante con el mismo nombre"
                onClick={() => handleCrearVariante(cot.codigo)}
                style={{
                  padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px',
                  background: '#f8fafc', color: '#475569', fontWeight: 700,
                  fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; }}
              >
                ＋ Variante
              </button>
              <button className="action-btn" title="Copiar" onClick={() => { navigator.clipboard.writeText(construirUrlPublica(cot.slug)); toast.success('Copiado'); }}>📋</button>
              <button className="action-btn delete" title="Eliminar" onClick={() => setDeleteModal({ isOpen: true, cotizacionId: String(cot.id), isLoading: false })}>🗑️</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const grupos = agruparCotizaciones(cotizaciones);
  const totalVisibles = cotizaciones.filter(cot => {
    const e = String(cot.estado || '').toLowerCase().trim();
    return e !== 'ganada' && e !== 'perdida';
  }).length;

  return (
    <div className="app-container">
      <div className="cover-header"></div>

      <div className="dashboard-container">
        {/* COLUMNA IZQUIERDA */}
        <div className="sidebar-col">
          <div className="card-box profile-card">
            <div className="profile-avatar editable-avatar" onClick={handleAvatarClick}>
              <img src={avatarUrl} alt="Foto de perfil" className="profile-image"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              <div className="avatar-overlay">📷 Cambiar</div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
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

          <div className="card-box nav-card">
            <div className="nav-title">Menú Principal</div>
            <Link to="/dashboard" className="nav-link active">📊 Dashboard</Link>

            {/* ✅ Visible para TODOS — empleados y admins */}
            <Link to="/cotizaciones/cerradas" className="nav-link">📁 Cotizaciones Cerradas</Link>

            {currentUser?.role === 'admin' && (
              <>
                <Link to="/admin/dashboard" className="nav-link">📈 Estadísticas Globales</Link>
                <Link to="/admin/usuarios" className="nav-link">👤 Gestión de Usuarios</Link>
              </>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="main-col">
          {metricas && (
            <div className="metrics-grid">
              <div className="card-box metric-card">
                <span className="metric-label">Total Cotizaciones</span>
                <span className="metric-value">{metricas.totalCotizaciones}</span>
              </div>
              <div className="card-box metric-card">
                <span className="metric-label" style={{ color: '#2563eb' }}>Total Visitas</span>
                <span className="metric-value" style={{ color: '#2563eb' }}>{metricas.totalVisitas}</span>
              </div>
              <div className="card-box metric-card">
                <span className="metric-label">Promedio</span>
                <span className="metric-value">
                  {metricas.totalCotizaciones > 0 ? Math.round(metricas.totalVisitas / metricas.totalCotizaciones) : 0}
                </span>
              </div>
              <div className="card-box metric-card">
                <span className="metric-label" style={{ color: '#f97316' }}>Más Vista</span>
                <span className="metric-value" style={{ color: '#f97316' }}>
                  {metricas.masVista || (cotizaciones.length > 0 ? Math.max(...cotizaciones.map(c => c.total_visitas || 0)) : 0)}
                </span>
              </div>
            </div>
          )}

          {/* Formulario Nueva Cotización */}
          <div className="card-box new-quote-card" ref={formRef}>
            <h3 className="section-title">🚀 Nueva Cotización</h3>
            <form onSubmit={handleSubmit} className="form-row">
              <div className="form-col">
                <label className="form-label">Código de Referencia</label>
                <input
                  className="input-field"
                  placeholder="Ej: COT-2026-001"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
              <div className="form-col">
                <label className="form-label">Valor de la Cotización (COP)</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Ej: 5.000.000"
                  value={valor}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                    const formattedValue = rawValue === '' ? '' : new Intl.NumberFormat('es-CO').format(parseInt(rawValue));
                    setValor(formattedValue);
                  }}
                />
              </div>
              <div className="form-col">
                <label className="form-label">Archivo PDF</label>
                <input type="file" id="file-upload" accept=".pdf" className="input-field file-field" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
              </div>
              <button type="submit" disabled={uploading || !codigo || !pdfFile} className="btn-primary">
                {uploading ? 'Subiendo...' : 'Generar Link ✨'}
              </button>
            </form>
          </div>


          {/* Lista en Cascada */}
          <div className="card-box list-card">
            <div className="list-header">
              <h3>Cotizaciones Recientes</h3>
              <span style={{ fontSize: '0.8rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, color: '#475569' }}>
                {totalVisibles} visibles
              </span>
            </div>

            <div className="list-body">
              {grupos.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No hay cotizaciones pendientes 🎉
                </div>
              ) : (
                grupos.map(({ parent, children }) => {
                  const hasChildren = children.length > 0;
                  const isExpanded = !collapsedGroups.has(parent.id);
                  return (
                    <div key={parent.id}>
                      {renderRow(parent, false, hasChildren, isExpanded)}
                      {hasChildren && isExpanded && (
                        <div>
                          {children.map(child => renderRow(child, true, false, false))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

            </div>

            {pagination.pages > 1 && (
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button className="action-btn" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>←</button>
                <span style={{ alignSelf: 'center', fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>
                  Página {pagination.page} de {pagination.pages}
                </span>
                <button className="action-btn" disabled={pagination.page === pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>→</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        title="Eliminar cotización"
        message="¿Seguro que deseas eliminar esta cotización y todas sus analíticas?"
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        isDangerous={true}
        onConfirm={handleEliminar}
        onCancel={() => setDeleteModal({ isOpen: false, cotizacionId: '', isLoading: false })}
      />
    </div>
  );
};

export default Dashboard;