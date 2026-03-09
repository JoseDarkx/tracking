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
  estado?: 'pendiente' | 'ganada' | 'perdida';
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
  masVista: number;
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
  avatarUrl?: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface CotizacionPublicaData {
  pdfUrl: string;
  visitaId: string;
  codigo: string;
  asesorNombre: string;
}

export interface CreateUserPayload {
  nombre: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
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

export const adminCreateUser = async (
  payload: CreateUserPayload,
) => {
  const response = await api.post(
    '/auth/admin/create-user',
    payload,
  );
  return response.data;
};

export const createUser = adminCreateUser;

export const getAllUsers = async (): Promise<User[]> => {
  const response = await api.get('/auth/admin/users');
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.post(`/auth/admin/delete-user/${id}`);
  return response.data;
};

export const adminChangePasswordByEmail = async (
  email: string,
  newPassword: string,
) => {
  const response = await api.post('/auth/admin/change-password', {
    email,
    newPassword,
  });
  return response.data;
};

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
  userId?: string // <--- Agregamos este parámetro opcional
): Promise<ListarCotizacionesResponse> => {
  const response = await api.get('/cotizaciones', {
    // Agregamos userId a los parámetros de la consulta
    params: { page, limit, userId },
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

export const obtenerEstadisticasEmpleados = async (): Promise<
  Array<{ id: string; nombre: string; cotizaciones: number; ganadas: number; perdidas: number }>
> => {
  const response = await api.get('/admin/estadisticas/empleados');
  return response.data;
};

export const obtenerTopCotizaciones = async (): Promise<
  Array<{ name: string; value: number }>
> => {
  const response = await api.get('/admin/estadisticas/top-vistas');
  return response.data;
};

// 🏷️ Cambiar el estado de una cotización
export const cambiarEstadoCotizacion = async (id: string, estado: string) => {
  const response = await api.patch(`/cotizaciones/${id}/estado`, { estado });
  return response.data;
};


// ===============================
// 🌐 PUBLIC URL
// ===============================
export const construirUrlPublica = (slug: string): string => {
  const baseUrl = window.location.origin; // Obtiene el origen actual (protocolo + host + puerto)
  return `${baseUrl}/c/${slug}`;
};

// ===============================
// 🌐 PUBLIC - COTIZACIÓN PÚBLICA (sin auth)
// ===============================
export const obtenerCotizacionPublica = async (
  slug: string,
): Promise<CotizacionPublicaData> => {
  const response = await axios.get(`/c/${slug}`);
  return response.data;
};
// ===============================
// 📸 PERFIL Y AVATAR
// ===============================
export const subirFotoPerfilAPI = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file); // 'file' será el nombre del campo que reciba NestJS

  // Enviamos la imagen al backend (asumimos la ruta /auth/avatar)
  const response = await api.post('/auth/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  // ✨ LA MAGIA: Actualizamos el localStorage para que la foto no se borre con F5
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    // Asignamos la nueva URL que nos devuelva el backend
    user.avatarUrl = response.data.avatarUrl;
    localStorage.setItem('user', JSON.stringify(user));
  }

  return response.data;
};
export default api;