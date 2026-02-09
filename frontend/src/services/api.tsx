import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===============================
// 🔐 INTERCEPTOR JWT
// ===============================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ===============================
// 📦 TYPES
// ===============================
export interface Asesor {
  nombre: string;
  email?: string;
}

export interface Cotizacion {
  id: number;
  codigo: string;
  slug: string;
  total_visitas: number;
  created_at: string;
  publicUrl?: string;
  asesor?: Asesor | null;
  user_id?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ListarCotizacionesResponse {
  data: Cotizacion[];
  pagination: PaginationInfo;
}

export interface MetricasDashboard {
  totalCotizaciones: number;
  totalVisitas: number;
  visitasPorCotizacion: Array<{
    codigo: string;
    visitas: number;
  }>;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  role: 'admin' | 'employee';
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

// ===============================
// 🔐 AUTH
// ===============================
export const login = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

/**
 * ⚠️ NO usar en frontend público
 * Se mantiene solo para compatibilidad
 */
export const register = async (
  nombre: string,
  email: string,
  password: string,
  role: string = 'employee',
): Promise<LoginResponse> => {
  const response = await api.post('/auth/register', {
    nombre,
    email,
    password,
    role,
  });
  return response.data;
};

// ===============================
// 👨‍💼 ADMIN
// ===============================
export interface CreateUserPayload {
  nombre: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
}

/**
 * Función real (endpoint admin)
 */
export const adminCreateUser = async (
  payload: CreateUserPayload,
) => {
  const response = await api.post(
    '/auth/admin/create-user',
    payload,
  );
  return response.data;
};

/**
 * ✅ Alias para evitar romper imports existentes
 * createUser === adminCreateUser
 */
export const createUser = adminCreateUser;

export const getProfile = async (): Promise<User> => {
  const response = await api.get('/auth/profile');
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// ===============================
// 📄 COTIZACIONES
// ===============================
export const listarCotizaciones = async (
  page: number = 1,
  limit: number = 10,
): Promise<ListarCotizacionesResponse> => {
  const response = await api.get('/cotizaciones', {
    params: { page, limit },
  });
  return response.data;
};

export const crearCotizacion = async (
  codigo: string,
  pdfFile: File,
): Promise<any> => {
  const formData = new FormData();
  formData.append('codigo', codigo);
  formData.append('pdf', pdfFile);

  const response = await api.post('/cotizaciones', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const eliminarCotizacion = async (cotizacionId: string) => {
  const response = await api.delete(`/cotizaciones/${cotizacionId}`);
  return response.data;
};

export const obtenerMetricas = async (): Promise<MetricasDashboard> => {
  const response = await api.get('/metricas');
  return response.data;
};

// ===============================
// 🌐 PUBLIC URL
// ===============================
export const construirUrlPublica = (slug: string): string => {
  const baseUrl =
    import.meta.env.VITE_PUBLIC_URL || 'http://localhost:3000';
  return `${baseUrl}/c/${slug}`;
};

export default api;
