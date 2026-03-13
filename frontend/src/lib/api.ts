import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';
import type { ApiResponse } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // 2 min — AI resume operations (tailor/generate/enhance) can take 60-90s
});

// Attach token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('careerbridge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('careerbridge_token');
      localStorage.removeItem('careerbridge_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Typed request helpers
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(url, config);
  return data.data;
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.post<ApiResponse<T>>(url, body, config);
  return data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.put<ApiResponse<T>>(url, body);
  return data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<ApiResponse<T>>(url, body);
  return data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await apiClient.delete<ApiResponse<T>>(url);
  return data.data;
}

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'Something went wrong';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
