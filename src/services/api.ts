import axios from 'axios';
import {
  User, Dataset, DatasetDetailResponse, DatasetPreviewResponse,
  CleaningAnalysis, CleaningOperation, EDASummary, ChatSession,
  ChatMessage, MLModel, BIDashboard, BusinessReport, ActivityLog
} from '../types';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication
export const authService = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (email: string, password: string, full_name: string) => {
    const res = await apiClient.post('/auth/register', { email, password, full_name });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
};

// Datasets
export const datasetService = {
  list: async (search?: string): Promise<Dataset[]> => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/datasets', { params });
    return res.data;
  },
  get: async (id: string): Promise<Dataset> => {
    const res = await apiClient.get(`/datasets/${id}`);
    return res.data;
  },
  preview: async (id: string, limit = 50, offset = 0) => {
    const res = await apiClient.get(`/datasets/${id}/preview`, { params: { limit, offset } });
    return res.data;
  },
  upload: async (file: File, name?: string, autoClean: boolean = true): Promise<Dataset> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    formData.append('auto_clean', String(autoClean));
    const res = await apiClient.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  download: async (id: string, filename: string, format: 'csv' | 'xlsx' = 'csv') => {
    const res = await apiClient.get(`/datasets/${id}/download`, {
      params: { format },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    const ext = format === 'xlsx' ? 'xlsx' : 'csv';
    const cleanBaseName = filename.replace(/\.[^/.]+$/, '');
    link.setAttribute('download', `${cleanBaseName}.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/datasets/${id}`);
    return res.data;
  },
};

// Cleaning
export const cleaningService = {
  analyze: async (datasetId: string): Promise<CleaningAnalysis> => {
    const res = await apiClient.post(`/cleaning/analyze?dataset_id=${datasetId}`);
    return res.data;
  },
  preview: async (datasetId: string, operations: CleaningOperation[]) => {
    const res = await apiClient.post('/cleaning/preview', {
      dataset_id: datasetId,
      operations,
    });
    return res.data;
  },
  apply: async (datasetId: string, operations: CleaningOperation[], newName?: string) => {
    const res = await apiClient.post('/cleaning/apply', {
      dataset_id: datasetId,
      operations,
      new_dataset_name: newName,
    });
    return res.data;
  },
  autoClean: async (datasetId: string, newName?: string) => {
    const res = await apiClient.post('/cleaning/auto-clean', {
      dataset_id: datasetId,
      new_dataset_name: newName,
    });
    return res.data;
  },
  getHistory: async (datasetId?: string) => {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const res = await apiClient.get('/cleaning/history', { params });
    return res.data;
  },
};

// Exploratory Data Analysis
export const analysisService = {
  getProfile: async (datasetId: string): Promise<EDASummary> => {
    const res = await apiClient.post(`/analysis/profile?dataset_id=${datasetId}`);
    return res.data;
  },
  getCorrelations: async (datasetId: string) => {
    const res = await apiClient.post(`/analysis/correlation?dataset_id=${datasetId}`);
    return res.data;
  },
  getCharts: async (datasetId: string) => {
    const res = await apiClient.post(`/analysis/charts?dataset_id=${datasetId}`);
    return res.data;
  },
};

// AI Data Assistant
export const aiService = {
  chat: async (datasetId: string, message: string, sessionId?: string): Promise<ChatMessage> => {
    const res = await apiClient.post('/ai/chat', {
      dataset_id: datasetId,
      message,
      session_id: sessionId,
    });
    return res.data;
  },
  getHistory: async (datasetId?: string): Promise<ChatSession[]> => {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const res = await apiClient.get('/ai/history', { params });
    return res.data;
  },
  executeDirectQuery: async (datasetId: string, sql: string) => {
    const res = await apiClient.post('/ai/query', null, {
      params: { dataset_id: datasetId, sql }
    });
    return res.data;
  }
};

// Machine Learning Studio
export const mlService = {
  train: async (data: {
    dataset_id: string;
    project_id?: string;
    name: string;
    task_type: string;
    algorithm: string;
    target_column?: string | null;
    feature_columns: string[];
    test_size?: number;
  }): Promise<MLModel> => {
    const res = await apiClient.post('/ml/train', data);
    return res.data;
  },
  list: async (datasetId?: string, taskType?: string): Promise<MLModel[]> => {
    const params: any = {};
    if (datasetId) params.dataset_id = datasetId;
    if (taskType) params.task_type = taskType;
    const res = await apiClient.get('/ml/models', { params });
    return res.data;
  },
  get: async (id: string): Promise<MLModel> => {
    const res = await apiClient.get(`/ml/models/${id}`);
    return res.data;
  },
  predict: async (modelId: string, inputs: Record<string, any>) => {
    const res = await apiClient.post('/ml/predict', { model_id: modelId, inputs });
    return res.data;
  },
  downloadArtifactUrl: (modelId: string) => `/api/ml/models/${modelId}/download`,
};

// Business Intelligence
export const biService = {
  getKPIs: async (datasetId: string) => {
    const res = await apiClient.get(`/bi/kpis?dataset_id=${datasetId}`);
    return res.data;
  },
  createDashboard: async (data: {
    dataset_id: string;
    project_id?: string;
    name: string;
    description?: string;
    kpis?: any[];
    charts?: any[];
  }): Promise<BIDashboard> => {
    const res = await apiClient.post('/bi/dashboards', data);
    return res.data;
  },
  listDashboards: async (datasetId?: string): Promise<BIDashboard[]> => {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const res = await apiClient.get('/bi/dashboards', { params });
    return res.data;
  },
  getDashboard: async (id: string): Promise<BIDashboard> => {
    const res = await apiClient.get(`/bi/dashboards/${id}`);
    return res.data;
  },
};

// Reports
export const reportService = {
  generate: async (datasetId: string, title: string, format = 'pdf'): Promise<BusinessReport> => {
    const res = await apiClient.post('/reports/generate', {
      dataset_id: datasetId,
      project_id: '',
      title,
      format,
    });
    return res.data;
  },
  list: async (datasetId?: string): Promise<BusinessReport[]> => {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const res = await apiClient.get('/reports', { params });
    return res.data;
  },
  downloadUrl: (reportId: string) => `/api/reports/${reportId}/download`,
};

// Workspace & Dashboard Summary
export const dashboardService = {
  getSummary: async () => {
    const res = await apiClient.get('/dashboard/summary');
    return res.data;
  },
  getHistory: async (entityType?: string): Promise<ActivityLog[]> => {
    const params = entityType ? { entity_type: entityType } : {};
    const res = await apiClient.get('/history', { params });
    return res.data;
  },
  deleteHistory: async (id: string) => {
    const res = await apiClient.delete(`/history/${id}`);
    return res.data;
  },
};

