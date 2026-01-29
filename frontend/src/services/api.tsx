// frontend/src/services/api.tsx
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface Cotizacion {
  id: number;
  codigo: string;
  slug: string;
  total_visitas: number;
  created_at: string;
  publicUrl?: string;
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
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

// ===============================
// 🔐 AUTH
// ===============================
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (nombre: string, email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post('/auth/register', { nombre, email, password });
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
export const listarCotizaciones = async (): Promise<Cotizacion[]> => {
  const response = await api.get('/cotizaciones');
  return response.data;
};

export const crearCotizacion = async (
  codigo: string,
  pdfFile: File
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

export const obtenerMetricas = async (): Promise<MetricasDashboard> => {
  const response = await api.get('/metricas');
  return response.data;
};

export const construirUrlPublica = (slug: string): string => {
  const baseUrl = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:3000';
  return `${baseUrl}/c/${slug}`;
};

export default api;