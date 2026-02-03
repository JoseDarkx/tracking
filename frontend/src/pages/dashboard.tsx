// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  listarCotizaciones,
  crearCotizacion,
  obtenerMetricas,
  construirUrlPublica,
  getCurrentUser,
  type Cotizacion,
  type MetricasDashboard,
  type PaginationInfo,
  type User,
} from '../services/api';

const Dashboard = () => {
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Form state
  const [codigo, setCodigo] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    cargarDatos();
  }, [pagination.page]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [metricasData, cotizacionesResponse] = await Promise.all([
        obtenerMetricas(),
        listarCotizaciones(pagination.page, 10),
      ]);
      setMetricas(metricasData);
      setCotizaciones(cotizacionesResponse.data);
      setPagination(cotizacionesResponse.pagination);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!codigo || !pdfFile) {
    toast.error('Completa todos los campos');
    return;
  }

  try {
    setUploading(true);
    const result = await crearCotizacion(codigo, pdfFile);
    
    toast.success('¡Cotización creada exitosamente!');
    
    // El backend devuelve { ok, cotizacion, publicUrl }
    const link = result.publicUrl;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado al portapapeles');

    // Reset form
    setCodigo('');
    setPdfFile(null);
    
    // Limpiar el input file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    // Recargar datos - volver a página 1
    setPagination(prev => ({ ...prev, page: 1 }));
    // Recargar datos
    await cargarDatos();
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Error al crear cotización');
    console.error(error);
  } finally {
    setUploading(false);
  }
};

  const copiarLink = (slug: string) => {
    const link = construirUrlPublica(slug);
    navigator.clipboard.writeText(link);
    toast.success('Link copiado al portapapeles');
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Vista general de tus cotizaciones y métricas de visualización
        </p>
      </div>

      {/* Stats Cards */}
      {metricas && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Cotizaciones</div>
            <div className="stat-value">{metricas.totalCotizaciones}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Visitas</div>
            <div className="stat-value">{metricas.totalVisitas}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Promedio Visitas</div>
            <div className="stat-value">
              {metricas.totalCotizaciones > 0
                ? Math.round(metricas.totalVisitas / metricas.totalCotizaciones)
                : 0}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Más Vista</div>
            <div className="stat-value">
              {metricas.visitasPorCotizacion.length > 0
                ? Math.max(...metricas.visitasPorCotizacion.map(v => v.visitas))
                : 0}
            </div>
          </div>
        </div>
      )}

      {/* Formulario de Upload */}
      <div className="form-section">
        <div className="card-header">
          <h2 className="card-title">Nueva Cotización</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Código de cotización</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej: COT-2024-001"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Archivo PDF</label>
            <div className="form-file-upload">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
                id="file-upload"
                disabled={uploading}
              />
              <label htmlFor="file-upload" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
                <div className="upload-icon">📄</div>
                <div className="upload-text">
                  {pdfFile ? (
                    <strong>{pdfFile.name}</strong>
                  ) : (
                    <strong>Haz clic para seleccionar tu PDF</strong>
                  )}
                </div>
                <div className="upload-hint">Máximo 10MB · Solo archivos PDF</div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={uploading || !codigo || !pdfFile}
          >
            <span>📤</span>
            <span>{uploading ? 'Subiendo...' : 'Crear link rastreable'}</span>
          </button>
        </form>
      </div>

      {/* Lista de Cotizaciones */}
      <div className="list-container">
        <div className="list-header">
          <h2 className="list-title">Cotizaciones Activas</h2>
          <span className="badge badge-neutral">
            {cotizaciones.length} total
          </span>
        </div>

        {cotizaciones.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <h3 className="empty-state-title">No hay cotizaciones aún</h3>
            <p className="empty-state-description">
              Comienza subiendo tu primer PDF para crear un link rastreable
            </p>
          </div>
        ) : (
          cotizaciones.map((cot) => (
            <div key={cot.id} className="list-item">
              <div className="list-item-content">
                <div className="list-item-header">
                  <h3 className="list-item-title">{cot.codigo}</h3>
                  {cot.asesor && (
                    <div className="list-item-asesor">
                      <span className="badge badge-primary">
                        👤 {cot.asesor.nombre}
                      </span>
                    </div>
                  )}
                </div>
                <a
                  href={construirUrlPublica(cot.slug)}
                  className="list-item-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {construirUrlPublica(cot.slug)}
                </a>
                <div className="list-item-meta">
                  <span className="list-item-meta-item">
                    👁️ <strong>{cot.total_visitas}</strong> visitas
                  </span>
                  <span className="list-item-meta-item">
                    📅 {formatearFecha(cot.created_at)}
                  </span>
                  {/* Email del asesor oculto por privacidad; sólo se muestra el nombre */}
                  <span className="badge badge-success">Activo</span>
                </div>
              </div>
              <div className="list-item-actions">
                <button
                  className="icon-btn"
                  title="Ver PDF"
                  onClick={() => window.open(construirUrlPublica(cot.slug), '_blank')}
                >
                  👁️
                </button>
                <button
                  className="icon-btn"
                  title="Copiar link"
                  onClick={() => copiarLink(cot.slug)}
                >
                  📋
                </button>
              </div>
            </div>
          ))
        )}

        {/* Paginación */}
        {pagination.pages > 1 && (
          <div className="pagination-container">
            <button
              className="btn btn-sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              ← Anterior
            </button>

            <div className="pagination-info">
              Página <strong>{pagination.page}</strong> de <strong>{pagination.pages}</strong>
              {pagination.total > 0 && (
                <span className="pagination-total">
                  ({pagination.total} total)
                </span>
              )}
            </div>

            <button
              className="btn btn-sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;