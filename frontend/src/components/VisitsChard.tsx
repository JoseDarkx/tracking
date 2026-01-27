import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function VisitsChart({ data }: any) {
  const chartData = data.map((c: any) => ({
    name: c.codigo,
    visitas: c.total_visitas || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="visitas" />
      </BarChart>
    </ResponsiveContainer>
  );
}
