export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetColumn {
  id: string;
  name: string;
  data_type: 'numerical' | 'categorical' | 'datetime' | 'boolean' | 'text';
  raw_type: string;
  null_count: number;
  unique_count: number;
  sample_values: (string | number | boolean | null)[];
  stats?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    std?: number;
    q25?: number;
    q75?: number;
    skewness?: number;
    kurtosis?: number;
    null_pct?: number;
    unique_pct?: number;
    top_categories?: { category: string; count: number; pct: number }[];
    min_date?: string;
    max_date?: string;
  };
}

export interface Dataset {
  id: string;
  project_id: string;
  name: string;
  original_filename: string;
  file_type: string;
  row_count: number;
  col_count: number;
  file_size_bytes: number;
  is_cleaned: boolean;
  parent_dataset_id?: string | null;
  created_at: string;
  columns?: DatasetColumn[];
  summary?: {
    total_rows: number;
    total_columns: number;
    duplicate_rows: number;
    total_missing_cells: number;
    missing_cells_pct: number;
    columns_by_type: Record<string, number>;
  };
}

export interface DatasetPreviewResponse {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
  offset: number;
  limit: number;
}

export interface DatasetDetailResponse extends Dataset {
  preview?: DatasetPreviewResponse;
}

export interface CleaningOperation {
  operation: 'drop_duplicates' | 'fill_missing' | 'drop_columns' | 'handle_outliers' | 'convert_type' | 'standardize_text';
  column?: string;
  strategy?: string;
  custom_value?: any;
  target_type?: string;
}

export interface CleaningRecommendation {
  issue_type: string;
  column?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affected_count: number;
  recommended_operation: CleaningOperation;
}

export interface CleaningAnalysis {
  dataset_id: string;
  total_rows: number;
  total_columns: number;
  duplicate_rows_count: number;
  missing_cells_count: number;
  recommendations: CleaningRecommendation[];
  column_quality_summary: Record<string, any>;
}

export interface DescriptiveStat {
  column: string;
  data_type: string;
  count: number;
  missing: number;
  missing_pct: number;
  unique: number;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  q25?: number | null;
  median?: number | null;
  q75?: number | null;
  max?: number | null;
  skewness?: number | null;
  kurtosis?: number | null;
  top_values?: { category: string; count: number; pct: number }[];
}

export interface EDASummary {
  dataset_id: string;
  row_count: number;
  col_count: number;
  statistics: DescriptiveStat[];
  correlations?: Record<string, Record<string, number>>;
  missing_matrix: Record<string, number>;
  recommended_charts: {
    chart_type: string;
    title: string;
    x_axis?: string;
    y_axis?: string;
    category_col?: string;
    aggregation?: string;
    description: string;
  }[];
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  agent_name: string;
  content: string;
  query_sql?: string | null;
  execution_result?: {
    columns: string[];
    rows: Record<string, any>[];
    total_rows: number;
  } | null;
  chart_config?: {
    chart_type: string;
    title: string;
    x_key: string;
    y_key: string;
    data: any[];
  } | null;
  agent_status: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  dataset_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface MLModel {
  id: string;
  dataset_id: string;
  project_id: string;
  name: string;
  task_type: 'regression' | 'classification' | 'clustering' | 'time_series';
  algorithm: string;
  target_column?: string | null;
  feature_columns: string[];
  metrics: {
    mae?: number;
    mse?: number;
    rmse?: number;
    r2?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    confusion_matrix?: number[][];
    roc_auc?: number;
    silhouette_score?: number;
    cluster_distribution?: Record<string, number>;
  };
  feature_importance?: { feature: string; importance: number }[];
  evaluation_chart_data?: any[];
  created_at: string;
}

export interface BIDashboard {
  id: string;
  project_id: string;
  dataset_id: string;
  name: string;
  description?: string;
  kpis: {
    id: string;
    title: string;
    column?: string;
    aggregation: string;
    value: any;
    format: 'currency' | 'percentage' | 'number';
    subtitle?: string;
  }[];
  charts: {
    id: string;
    type: 'bar' | 'line' | 'pie' | 'scatter';
    title: string;
    x_key?: string;
    y_key?: string;
    category_key?: string;
    value_key?: string;
    data: any[];
  }[];
  layout?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BusinessReport {
  id: string;
  project_id: string;
  dataset_id: string;
  title: string;
  format: 'pdf' | 'excel' | 'csv';
  file_path: string;
  sections?: Record<string, any>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}
