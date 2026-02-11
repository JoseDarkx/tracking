import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const PublicView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<{
    pdfUrl: string;
    visitaId: string;
    codigo: string;
    asesorNombre: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCotizacion = async () => {
      if (!slug) return;
      
      try {
        console.log('🔍 Cargando cotización:', slug);
        const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
        const response = await axios.get(`${backendUrl}/c/${slug}`);
        console.log('✅ Datos recibidos:', response.data);
        setData(response.data);
      } catch (err: any) {
        console.error('❌ Error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCotizacion();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #a3e635',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ fontSize: '18px', fontStyle: 'italic' }}>Cargando su factura Surcompany...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🚫</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            Cotización no encontrada
          </h1>
          <p style={{ color: '#999' }}>El link ha expirado o no existe</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#1a1a1a'
    }}>
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(180deg, #000000 0%, #1a1a1a 100%)',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(163, 230, 53, 0.2)',
        zIndex: 1000,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #ff0000 0%, #ffffff 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'black',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(163, 230, 53, 0.4)'
          }}>
            {data.asesorNombre?.substring(0, 2).toUpperCase() || 'SC'}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ececec' }}>
              {data.asesorNombre || 'Asesor Sur Company'}
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>
              Cotización: <span style={{ color: 'white', fontFamily: 'monospace' }}>{data.codigo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PDF CONTAINER */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#2d2d2d',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* LOGO FLOTANTE */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            padding: '10px 30px',
            borderRadius: '0 0 20px 20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            textAlign: 'center',
            border: '1px solid #f0f0f0',
            borderTop: 'none'
          }}>
            <div style={{
              color: '#000000',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: '24px',
              lineHeight: 1,
              letterSpacing: '-0.5px'
            }}>
              SUR
            </div>
            <div style={{
              color: '#da0000',
              fontWeight: 'bold',
              fontStyle: 'italic',
              fontSize: '15px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase'
            }}>
              Company
            </div>
          </div>

          {/* IFRAME PDF */}
          <iframe
            src={`${data.pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              paddingTop: '60px'
            }}
            title="Visor de Cotización"
          />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        background: 'rgba(0,0,0,0.8)',
        color: '#666',
        textAlign: 'center',
        padding: '8px',
        fontSize: '11px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0
      }}>
        Powered by SurCompany S.A.S • Cotización privada y confidencial
      </div>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          div:first-child > div:first-child,
          div:first-child > div:last-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicView;