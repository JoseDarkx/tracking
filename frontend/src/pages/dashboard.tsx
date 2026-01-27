import { useEffect, useState } from 'react';
import { api } from '../api/api';
import './dashboard.css';

export default function Dashboard() {
  const [cotizaciones, setCotizaciones] = useState<any[]>([]);
  const [codigo, setCodigo] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarCotizaciones();
  }, []);

  async function cargarCotizaciones() {
    const res = await api.get('/cotizaciones');
    setCotizaciones(res.data);
  }

  async function crearCotizacion() {
    if (!codigo || !pdf) {
      alert('Debes ingresar código y PDF');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('codigo', codigo);
    formData.append('pdf', pdf);

    try {
      await api.post('/cotizaciones', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCodigo('');
      setPdf(null);
      await cargarCotizaciones();
    } catch (e) {
      alert('Error creando cotización');
    } finally {
      setLoading(false);
    }
  }

  async function eliminarCotizacion(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta cotización?')) return;

    try {
      await api.delete(`/cotizaciones/${id}`);
      await cargarCotizaciones();
    } catch (e) {
      alert('Error eliminando cotización');
    }
  }

  const totalVisitas = cotizaciones.reduce(
    (acc, c) => acc + (c.total_visitas || 0),
    0
  );

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="logo">🔗</div>
        <div>
          <h1>SurCompany Tracker</h1>
          <p>Monitoreo de cotizaciones</p>
        </div>
      </header>

      {/* CONTENIDO CENTRADO */}
      <div className="content">
        {/* STATS */}
        <div className="stats">
          <Stat title="Cotizaciones" value={cotizaciones.length} />
          <Stat title="Total Visitas" value={totalVisitas} />
          <Stat title="Visitantes Activos" value={0} />
          <Stat title="Tiempo Promedio" value="0s" />
        </div>

        {/* MAIN */}
        <div className="main">
          {/* FORM */}
          <div className="card form">
            <h3>✨ Nueva Cotización</h3>

            <label>Código de Cotización</label>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: COT-2024-001"
            />

            <label>PDF de la Cotización</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdf(e.target.files?.[0] || null)}
            />

            <button onClick={crearCotizacion} disabled={loading}>
              {loading ? 'Creando...' : 'Crear Cotización'}
            </button>
          </div>

          {/* LIST */}
          <div className="list">
            <h3>Cotizaciones Activas</h3>

            {cotizaciones.map((c) => {
              const trackingUrl = `${import.meta.env.VITE_PUBLIC_URL}/c/${c.slug}`;

              return (
                <div key={c.id} className="card cotizacion">
                  <div className="row">
                    <strong>{c.codigo}</strong>
                    <div className="actions">
                      <button
                        onClick={() => window.open(trackingUrl, '_blank')}
                        title="Ver"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => eliminarCotizacion(c.id)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <span className="date">
                    Creado{' '}
                    {new Date(c.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="mini-stats">
                    <MiniStat label="Visitas" value={c.total_visitas || 0} />
                    <MiniStat label="Activos" value={0} />
                    <MiniStat label="Promedio" value="0s" />
                  </div>

                  <div className="link">
                    <span>Link de tracking:</span>
                    <div className="link-box">
                      <a href={trackingUrl} target="_blank" rel="noreferrer">
                        {trackingUrl}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(trackingUrl);
                          alert('Link copiado al portapapeles');
                        }}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* COMPONENTS */

function Stat({ title, value }: any) {
  return (
    <div className="stat">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniStat({ label, value }: any) {
  return (
    <div className="mini">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
