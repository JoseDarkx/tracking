import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getCurrentUser, obtenerCotizacionesCerradas, eliminarCotizacion, subirFotoPerfilAPI, type Cotizacion } from '../services/api';
import { ConfirmDialog } from '../components/ConfirmDialog';

/**
 * Vista de cotizaciones que ya han sido cerradas como Ganadas o Perdidas.
 * Permite filtrar resultados, visualizar totales y eliminar registros.
 */
const CotizacionesCerradas = () => {
    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === 'admin';

    const [ganadas, setGanadas] = useState<Cotizacion[]>([]);
    const [perdidas, setPerdidas] = useState<Cotizacion[]>([]);
    const [totalGanado, setTotalGanado] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, cotizacionId: '', isLoading: false });

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


    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await obtenerCotizacionesCerradas();
                setGanadas(data.ganadas);
                setPerdidas(data.perdidas);
                setTotalGanado(data.totalGanado ?? 0);
            } catch {
                toast.error('Error al cargar cotizaciones cerradas');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Formatea número como COP
    const formatCOP = (n: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

    const handleEliminar = async () => {

        try {
            await eliminarCotizacion(deleteModal.cotizacionId);
            setGanadas(prev => prev.filter(c => String(c.id) !== deleteModal.cotizacionId));
            setPerdidas(prev => prev.filter(c => String(c.id) !== deleteModal.cotizacionId));
            toast.success('Cotización eliminada');
            setDeleteModal({ isOpen: false, cotizacionId: '', isLoading: false });
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const formatFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

    /**
     * Renderiza una fila individual para una cotización cerrada.
     * @param props Datos de la cotización y su tipo de cierre.
     */
    const CardItem = ({ cot, tipo }: { cot: Cotizacion; tipo: 'ganada' | 'perdida' }) => (
        <div
            style={{
                padding: '14px 18px',
                borderBottom: '1px solid',
                borderColor: tipo === 'ganada' ? '#dcfce7' : '#fee2e2',
                display: 'flex', alignItems: 'center', gap: '12px',
                transition: 'background 0.15s',
                cursor: 'default',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = tipo === 'ganada' ? '#f0fdf4' : '#fff1f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
        >
            {/* Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        fontWeight: 700, fontSize: '0.9rem', color: '#0f172a',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {cot.codigo}
                    </span>
                    <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                        background: tipo === 'ganada' ? '#dcfce7' : '#fee2e2',
                        color: tipo === 'ganada' ? '#166534' : '#991b1b',
                    }}>
                        {tipo === 'ganada' ? '✓ GANADA' : '✗ PERDIDA'}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: '#64748b' }}>
                    {cot.asesor && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            👤 {cot.asesor.nombre}
                        </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📅 {formatFecha(cot.created_at)}
                    </span>
                    {tipo === 'ganada' && cot.valor != null && (
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            color: '#16a34a', fontWeight: 700,
                        }}>
                            💰 {formatCOP(cot.valor)}
                        </span>
                    )}
                </div>
            </div>

            {/* Botón eliminar */}
            <button
                onClick={() => setDeleteModal({ isOpen: true, cotizacionId: String(cot.id), isLoading: false })}
                title="Eliminar"
                style={{
                    flexShrink: 0, width: 32, height: 32,
                    border: '1px solid #fecaca', borderRadius: '8px',
                    background: 'white', color: '#ef4444',
                    fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#f87171';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'white';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#fecaca';
                }}
            >
                🗑️
            </button>
        </div>
    );

    /**
     * Define una columna de resultados (Ganadas o Perdidas).
     * @param props Propiedades de estilo y contenido para la columna.
     */
    const Column = ({
        titulo, items, tipo, accentColor, bgColor, emptyMsg
    }: {
        titulo: string; items: Cotizacion[]; tipo: 'ganada' | 'perdida';
        accentColor: string; bgColor: string; emptyMsg: string;
    }) => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{
                padding: '16px 20px', background: bgColor,
                borderBottom: `2px solid ${accentColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: '14px 14px 0 0',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{tipo === 'ganada' ? '✅' : '❌'}</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: tipo === 'ganada' ? '#166534' : '#991b1b' }}>
                        {titulo}
                    </span>
                </div>
                <span style={{
                    background: accentColor, color: 'white',
                    fontWeight: 700, fontSize: '0.85rem',
                    padding: '3px 12px', borderRadius: '20px',
                }}>
                    {items.length}
                </span>
            </div>
            <div style={{
                background: 'white', borderRadius: '0 0 14px 14px',
                border: '1px solid', borderColor: tipo === 'ganada' ? '#dcfce7' : '#fee2e2',
                borderTop: 'none', flex: 1,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                overflowY: 'auto', maxHeight: 'calc(100vh - 320px)',
            }}>
                {items.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
                            {tipo === 'ganada' ? '🎯' : '📭'}
                        </div>
                        {emptyMsg}
                    </div>
                ) : (
                    items.map(cot => <CardItem key={cot.id} cot={cot} tipo={tipo} />)
                )}
            </div>
        </div>
    );

    return (
        <div className="app-container">
            <div className="cover-header">
                <div style={{ color: 'white', fontSize: '2rem', fontWeight: 700, opacity: 0.9 }}>
                    Cotizaciones Cerradas
                </div>
            </div>

            <div className="dashboard-container">
                {/* SIDEBAR */}
                <div>
                    <div className="card-box profile-card" style={{ marginBottom: 24 }}>
                        <div className="profile-avatar editable-avatar" onClick={handleAvatarClick}>
                            <img src={avatarUrl} alt="Foto de perfil" className="profile-image"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            <div className="avatar-overlay">📷 Cambiar</div>
                            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                        </div>
                        <div className="profile-name">{currentUser?.nombre || 'Usuario'}</div>
                        <div className="profile-role">{isAdmin ? 'Administrador' : 'Colaborador'}</div>
                        <div className="profile-stats">
                            <div className="stat-item">
                                <span className="stat-num" style={{ color: '#16a34a' }}>{ganadas.length}</span>
                                <span className="stat-label">Ganadas</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-num" style={{ color: '#dc2626' }}>{perdidas.length}</span>
                                <span className="stat-label">Perdidas</span>
                            </div>
                        </div>
                    </div>

                    <div className="card-box nav-card">
                        <div className="nav-title">Menú Principal</div>
                        <Link to="/dashboard" className="nav-link">📊 Dashboard</Link>
                        <Link to="/cotizaciones/cerradas" className="nav-link active">📁 Cotizaciones Cerradas</Link>
                        {isAdmin && (
                            <>
                                <Link to="/admin/dashboard" className="nav-link">📈 Estadísticas Globales</Link>
                                <Link to="/admin/usuarios" className="nav-link">👤 Gestión de Usuarios</Link>
                            </>
                        )}
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{
                        background: 'white', borderRadius: '14px', padding: '20px 24px',
                        border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        display: 'flex', alignItems: 'center', gap: '24px',
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                Total cerradas
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                                {ganadas.length + perdidas.length}
                            </div>
                        </div>
                    <div style={{ flex: 3 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: 6 }}>
                                <span style={{ color: '#16a34a' }}>✅ {ganadas.length} ganadas</span>
                                <span style={{ color: '#dc2626' }}>❌ {perdidas.length} perdidas</span>
                            </div>
                            <div style={{ height: 10, borderRadius: 20, background: '#fee2e2', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 20,
                                    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                                    width: ganadas.length + perdidas.length > 0
                                        ? `${(ganadas.length / (ganadas.length + perdidas.length)) * 100}%`
                                        : '0%',
                                    transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                                }} />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
                                {ganadas.length + perdidas.length > 0
                                    ? `Tasa de cierre: ${Math.round((ganadas.length / (ganadas.length + perdidas.length)) * 100)}%`
                                    : 'Sin datos aún'}
                            </div>
                        </div>

                        {/* Total ganado */}
                        {totalGanado > 0 && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                                gap: '2px', flexShrink: 0,
                            }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                                    💰 Total Ganado
                                </span>
                                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a' }}>
                                    {formatCOP(totalGanado)}
                                </span>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 14 }}>
                            Cargando cotizaciones...
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                            <Column titulo="Ganadas" items={ganadas} tipo="ganada" accentColor="#16a34a" bgColor="#f0fdf4" emptyMsg="No hay cotizaciones ganadas aún" />
                            <Column titulo="Perdidas" items={perdidas} tipo="perdida" accentColor="#dc2626" bgColor="#fff1f2" emptyMsg="No hay cotizaciones perdidas" />
                        </div>
                    )}
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

export default CotizacionesCerradas;