import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
    PieChart, Pie
} from 'recharts';
import { obtenerEstadisticasEmpleados, obtenerTopCotizaciones } from '../services/api'; //
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<Array<{ id: string; nombre: string; cotizaciones: number }>>([]);
    const [donutData, setDonutData] = useState<Array<{ name: string; value: number }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Ejecución en paralelo de ambas fuentes de datos reales
                const [statsEmpleados, statsVistas] = await Promise.all([
                    obtenerEstadisticasEmpleados(),
                    obtenerTopCotizaciones()
                ]);

                setData(statsEmpleados);
                setDonutData(statsVistas);
            } catch (error) {
                toast.error('Error al cargar estadísticas');
                console.error(error);
                setDonutData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Redirección al hacer clic en una barra específica
    const handleBarClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const empleadoId = data.activePayload[0].payload.id;
            const nombre = data.activePayload[0].payload.nombre;
            
            navigate(`/?usuario=${empleadoId}`); 
            toast.success(`Filtrando por: ${nombre}`);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];
    const donutColors = ['#0ea5e9', '#2563eb', '#64748b', '#94a3b8', '#334155'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard Administrativo</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfico de Barras: Rendimiento por Empleado */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-2">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">
                        Rendimiento de Empleados (Click en barra para filtrar)
                    </h2>
                    {data.length > 0 ? (
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    onClick={handleBarClick}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="nombre" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{ fill: '#f3f4f6' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="cotizaciones" name="Total Cotizaciones" radius={[4, 4, 0, 0]}>
                                        {data.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center text-gray-400">
                            No hay datos de rendimiento disponibles.
                        </div>
                    )}
                </div>

                {/* Lista de Top Empleados */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-2 md:col-span-1">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">Ranking de Asesores</h2>
                    <div className="space-y-4">
                        {data.slice(0, 5).map((empleado, index) => (
                            <div 
                                key={empleado.id} 
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                onClick={() => navigate(`/?usuario=${empleado.id}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                        index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-400'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <span className="font-medium text-gray-700">{empleado.nombre}</span>
                                </div>
                                <div className="text-primary font-bold">
                                    {empleado.cotizaciones} <span className="text-xs text-gray-500 font-normal">cots</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Gráfico de Dona: Cotizaciones más vistas */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-2 md:col-span-1">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700">Cotizaciones con más Tráfico</h2>
                    {donutData.length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {donutData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} visitas`, 'Total']} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-2">
                            <p>Aún no hay registros de visitas.</p>
                            <span className="text-xs">Las vistas aparecerán aquí cuando los clientes abran los PDFs.</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;