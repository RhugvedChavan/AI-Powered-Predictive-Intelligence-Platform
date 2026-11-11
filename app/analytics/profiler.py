import os
import json
import numpy as np
import pandas as pd
from typing import Any, Optional

def infer_column_type(series: pd.Series) -> tuple[str, str]:
    """
    Infers user-friendly data type and raw dtype string.
    Returns: (data_type, raw_type) where data_type is one of:
    'numerical', 'categorical', 'datetime', 'boolean', 'text'
    """
    raw_type = str(series.dtype)
    
    if pd.api.types.is_bool_dtype(series):
        return "boolean", raw_type
    elif pd.api.types.is_datetime64_any_dtype(series):
        return "datetime", raw_type
    elif pd.api.types.is_numeric_dtype(series):
        # Check if integer or float
        return "numerical", raw_type
    else:
        # Check if string could be parsed as datetime
        non_null = series.dropna().astype(str).str.strip()
        if len(non_null) > 0:
            sample = non_null.head(50)
            try:
                # Try parsing sample as dates
                parsed = pd.to_datetime(sample, errors='coerce', format='mixed')
                if parsed.notna().sum() / len(sample) > 0.8:
                    return "datetime", raw_type
            except Exception:
                pass
            
            # Check cardinality
            unique_ratio = series.nunique() / max(len(series), 1)
            if series.nunique() <= 50 or unique_ratio < 0.2:
                return "categorical", raw_type
            else:
                return "text", raw_type
        return "categorical", raw_type

def profile_dataframe(df: pd.DataFrame) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """
    Profiles a pandas dataframe and computes summary statistics for each column.
    Returns: (overall_summary, column_profiles)
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    duplicate_rows = int(df.duplicated().sum())
    total_missing = int(df.isna().sum().sum())
    
    column_profiles = []
    
    for col in df.columns:
        series = df[col]
        data_type, raw_type = infer_column_type(series)
        null_count = int(series.isna().sum())
        unique_count = int(series.nunique())
        
        # Sample values
        sample_vals = series.dropna().head(10).tolist()
        # Convert non-serializable objects to string or native float/int
        clean_samples = []
        for val in sample_vals:
            if isinstance(val, (np.integer, int)):
                clean_samples.append(int(val))
            elif isinstance(val, (np.floating, float)):
                clean_samples.append(float(val) if not np.isnan(val) else None)
            else:
                clean_samples.append(str(val))
                
        stats: dict[str, Any] = {
            "null_count": null_count,
            "null_pct": round((null_count / max(total_rows, 1)) * 100, 2),
            "unique_count": unique_count,
            "unique_pct": round((unique_count / max(total_rows, 1)) * 100, 2)
        }
        
        if data_type == "numerical":
            num_series = pd.to_numeric(series, errors='coerce').dropna()
            if not num_series.empty:
                stats["min"] = float(num_series.min())
                stats["max"] = float(num_series.max())
                stats["mean"] = round(float(num_series.mean()), 4)
                stats["median"] = round(float(num_series.median()), 4)
                stats["std"] = round(float(num_series.std()), 4) if len(num_series) > 1 else 0.0
                stats["q25"] = round(float(num_series.quantile(0.25)), 4)
                stats["q75"] = round(float(num_series.quantile(0.75)), 4)
                stats["skewness"] = round(float(num_series.skew()), 4) if len(num_series) > 2 else 0.0
                stats["kurtosis"] = round(float(num_series.kurt()), 4) if len(num_series) > 3 else 0.0
        elif data_type in ("categorical", "text", "boolean"):
            value_counts = series.value_counts().head(8).to_dict()
            stats["top_categories"] = [
                {"category": str(k), "count": int(v), "pct": round((v / max(total_rows, 1)) * 100, 2)}
                for k, v in value_counts.items()
            ]
        elif data_type == "datetime":
            dt_series = pd.to_datetime(series, errors='coerce').dropna()
            if not dt_series.empty:
                stats["min_date"] = str(dt_series.min())
                stats["max_date"] = str(dt_series.max())
                
        column_profiles.append({
            "name": str(col),
            "data_type": data_type,
            "raw_type": raw_type,
            "null_count": null_count,
            "unique_count": unique_count,
            "sample_values": clean_samples,
            "stats": stats
        })
        
    overall_summary = {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "duplicate_rows": duplicate_rows,
        "total_missing_cells": total_missing,
        "missing_cells_pct": round((total_missing / max(total_rows * total_cols, 1)) * 100, 2),
        "columns_by_type": {
            "numerical": sum(1 for c in column_profiles if c["data_type"] == "numerical"),
            "categorical": sum(1 for c in column_profiles if c["data_type"] == "categorical"),
            "datetime": sum(1 for c in column_profiles if c["data_type"] == "datetime"),
            "boolean": sum(1 for c in column_profiles if c["data_type"] == "boolean"),
            "text": sum(1 for c in column_profiles if c["data_type"] == "text"),
        }
    }
    
    return overall_summary, column_profiles

def compute_correlation_matrix(df: pd.DataFrame) -> dict[str, dict[str, float]]:
    """
    Computes Pearson correlation for all numerical columns.
    """
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.empty or numeric_df.shape[1] < 2:
        return {}
    
    corr = numeric_df.corr(method="pearson").round(3)
    # Replace NaN with 0.0
    corr = corr.fillna(0.0)
    return corr.to_dict()

def recommend_visualizations(df: pd.DataFrame, column_profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Recommends suitable charts based on column data types and cardinality.
    """
    recommendations = []
    num_cols = [c["name"] for c in column_profiles if c["data_type"] == "numerical"]
    cat_cols = [c["name"] for c in column_profiles if c["data_type"] == "categorical" and c["unique_count"] <= 20]
    date_cols = [c["name"] for c in column_profiles if c["data_type"] == "datetime"]
    
    # 1. Time-Series Line / Area Chart
    if date_cols and num_cols:
        d_col = date_cols[0]
        n_col = num_cols[0]
        recommendations.append({
            "chart_type": "line",
            "title": f"Trend of {n_col} over {d_col}",
            "x_axis": d_col,
            "y_axis": n_col,
            "description": f"Displays temporal progression of {n_col} across {d_col} intervals."
        })
        recommendations.append({
            "chart_type": "area",
            "title": f"Cumulative {n_col} by {d_col}",
            "x_axis": d_col,
            "y_axis": n_col,
            "description": f"Shows area distribution and volume trends over time."
        })
        
    # 2. Categorical vs Numerical Bar Chart
    if cat_cols and num_cols:
        c_col = cat_cols[0]
        n_col = num_cols[0]
        recommendations.append({
            "chart_type": "bar",
            "title": f"Total {n_col} by {c_col}",
            "x_axis": c_col,
            "y_axis": n_col,
            "aggregation": "sum",
            "description": f"Compares aggregate {n_col} performance across {c_col} categories."
        })
        
    # 3. Categorical Composition Pie Chart
    if cat_cols:
        c_col = cat_cols[0]
        recommendations.append({
            "chart_type": "pie",
            "title": f"Distribution by {c_col}",
            "category_col": c_col,
            "description": f"Breakdown of records across distinct {c_col} values."
        })
        
    # 4. Numerical Scatter Plot (Relationship)
    if len(num_cols) >= 2:
        x_col = num_cols[0]
        y_col = num_cols[1]
        recommendations.append({
            "chart_type": "scatter",
            "title": f"Relationship: {x_col} vs {y_col}",
            "x_axis": x_col,
            "y_axis": y_col,
            "description": f"Evaluates correlation and dispersion between {x_col} and {y_col}."
        })
        
    # 5. Histogram / Distribution Chart
    if num_cols:
        n_col = num_cols[0]
        recommendations.append({
            "chart_type": "histogram",
            "title": f"Distribution of {n_col}",
            "x_axis": n_col,
            "description": f"Shows value frequency and spread for {n_col}."
        })
        
    return recommendations

