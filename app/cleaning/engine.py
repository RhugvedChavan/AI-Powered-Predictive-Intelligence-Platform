import re
import numpy as np
import pandas as pd
from typing import Any, Optional
from app.analytics.profiler import infer_column_type

class DataCleaningEngine:
    """
    Intelligent Data Cleaning engine that detects anomalies, proposes actionable
    cleaning operations, previews transformations, and generates before/after metrics.
    """
    
    @staticmethod
    def analyze_dataset(df: pd.DataFrame) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        """
        Inspects the dataframe for data quality issues and generates recommendations.
        """
        total_rows = len(df)
        total_cols = len(df.columns)
        duplicate_rows = int(df.duplicated().sum())
        total_missing = int(df.isna().sum().sum())
        
        recommendations = []
        quality_summary = {
            "duplicate_rows": duplicate_rows,
            "total_missing_cells": total_missing,
            "missing_pct": round((total_missing / max(total_rows * total_cols, 1)) * 100, 2),
            "columns": {}
        }
        
        # 1. Check duplicate rows
        if duplicate_rows > 0:
            recommendations.append({
                "issue_type": "duplicates",
                "column": None,
                "description": f"Found {duplicate_rows} duplicate rows ({round((duplicate_rows/total_rows)*100, 1)}% of dataset).",
                "severity": "high" if duplicate_rows / total_rows > 0.05 else "medium",
                "affected_count": duplicate_rows,
                "recommended_operation": {
                    "operation": "drop_duplicates",
                    "column": None,
                    "strategy": "drop",
                    "custom_value": None,
                    "target_type": None
                }
            })
            
        # 2. Inspect each column
        for col in df.columns:
            series = df[col]
            data_type, raw_type = infer_column_type(series)
            null_count = int(series.isna().sum())
            null_pct = round((null_count / max(total_rows, 1)) * 100, 2)
            unique_count = int(series.nunique())
            
            quality_summary["columns"][col] = {
                "data_type": data_type,
                "null_count": null_count,
                "null_pct": null_pct,
                "unique_count": unique_count
            }
            
            # A. Constant or all-null column
            if null_count == total_rows:
                recommendations.append({
                    "issue_type": "all_null_column",
                    "column": col,
                    "description": f"Column '{col}' is completely empty (100% missing).",
                    "severity": "high",
                    "affected_count": total_rows,
                    "recommended_operation": {
                        "operation": "drop_columns",
                        "column": col,
                        "strategy": "drop",
                        "custom_value": None,
                        "target_type": None
                    }
                })
                continue
            elif unique_count == 1 and null_count == 0 and total_rows > 1:
                recommendations.append({
                    "issue_type": "constant_column",
                    "column": col,
                    "description": f"Column '{col}' contains only one constant value across all rows.",
                    "severity": "low",
                    "affected_count": total_rows,
                    "recommended_operation": {
                        "operation": "drop_columns",
                        "column": col,
                        "strategy": "drop",
                        "custom_value": None,
                        "target_type": None
                    }
                })
                
            # B. Missing values
            if null_count > 0:
                if data_type == "numerical":
                    strategy = "median"
                    rec_desc = f"Column '{col}' has {null_count} missing values ({null_pct}%). Impute with median."
                else:
                    strategy = "mode"
                    rec_desc = f"Column '{col}' has {null_count} missing values ({null_pct}%). Impute with most frequent value (mode)."
                    
                recommendations.append({
                    "issue_type": "missing_values",
                    "column": col,
                    "description": rec_desc,
                    "severity": "high" if null_pct > 20 else "medium",
                    "affected_count": null_count,
                    "recommended_operation": {
                        "operation": "fill_missing",
                        "column": col,
                        "strategy": strategy,
                        "custom_value": None,
                        "target_type": None
                    }
                })
                
            # C. Outliers in numerical columns
            if data_type == "numerical":
                num_series = pd.to_numeric(series, errors='coerce').dropna()
                if len(num_series) >= 20:
                    q25 = num_series.quantile(0.25)
                    q75 = num_series.quantile(0.75)
                    iqr = q75 - q25
                    lower_bound = q25 - 1.5 * iqr
                    upper_bound = q75 + 1.5 * iqr
                    outliers_count = int(((num_series < lower_bound) | (num_series > upper_bound)).sum())
                    
                    if outliers_count > 0:
                        recommendations.append({
                            "issue_type": "outliers",
                            "column": col,
                            "description": f"Column '{col}' has {outliers_count} statistical outliers via IQR method.",
                            "severity": "medium",
                            "affected_count": outliers_count,
                            "recommended_operation": {
                                "operation": "handle_outliers",
                                "column": col,
                                "strategy": "iqr_clip",
                                "custom_value": None,
                                "target_type": None
                            }
                        })
                        
            # D. Text whitespace and case inconsistency
            if data_type in ("categorical", "text"):
                str_series = series.dropna().astype(str)
                has_whitespace = str_series.str.strip() != str_series
                if has_whitespace.any():
                    ws_count = int(has_whitespace.sum())
                    recommendations.append({
                        "issue_type": "inconsistent_text",
                        "column": col,
                        "description": f"Column '{col}' contains leading or trailing whitespaces in {ws_count} rows.",
                        "severity": "low",
                        "affected_count": ws_count,
                        "recommended_operation": {
                            "operation": "standardize_text",
                            "column": col,
                            "strategy": "trim",
                            "custom_value": None,
                            "target_type": None
                        }
                    })

        return quality_summary, recommendations

    @staticmethod
    def apply_operations(df: pd.DataFrame, operations: list[dict[str, Any]]) -> tuple[pd.DataFrame, dict[str, Any], dict[str, Any]]:
        """
        Executes a sequence of approved cleaning operations on a copy of the dataframe.
        Returns: (cleaned_df, before_stats, after_stats)
        """
        cleaned_df = df.copy()
        
        before_stats = {
            "row_count": len(df),
            "col_count": len(df.columns),
            "duplicate_rows": int(df.duplicated().sum()),
            "missing_cells": int(df.isna().sum().sum()),
            "columns": {c: int(df[c].isna().sum()) for c in df.columns}
        }
        
        for op in operations:
            operation = op.get("operation")
            col = op.get("column")
            strategy = op.get("strategy")
            custom_val = op.get("custom_value")
            target_type = op.get("target_type")
            
            if operation == "drop_duplicates":
                cleaned_df = cleaned_df.drop_duplicates()
                
            elif operation == "drop_columns" and col in cleaned_df.columns:
                cleaned_df = cleaned_df.drop(columns=[col])
                
            elif operation == "fill_missing" and col in cleaned_df.columns:
                series = cleaned_df[col]
                if strategy == "mean" and pd.api.types.is_numeric_dtype(series):
                    mean_val = series.mean()
                    cleaned_df[col] = series.fillna(mean_val)
                elif strategy == "median" and pd.api.types.is_numeric_dtype(series):
                    median_val = series.median()
                    cleaned_df[col] = series.fillna(median_val)
                elif strategy == "mode":
                    mode_val = series.mode()
                    if not mode_val.empty:
                        cleaned_df[col] = series.fillna(mode_val.iloc[0])
                elif strategy == "custom" and custom_val is not None:
                    cleaned_df[col] = series.fillna(custom_val)
                elif strategy == "drop":
                    cleaned_df = cleaned_df.dropna(subset=[col])
                    
            elif operation == "handle_outliers" and col in cleaned_df.columns:
                series = pd.to_numeric(cleaned_df[col], errors='coerce')
                q25 = series.quantile(0.25)
                q75 = series.quantile(0.75)
                iqr = q75 - q25
                lower_bound = q25 - 1.5 * iqr
                upper_bound = q75 + 1.5 * iqr
                
                if strategy == "iqr_clip":
                    cleaned_df[col] = series.clip(lower=lower_bound, upper=upper_bound)
                elif strategy == "drop":
                    cleaned_df = cleaned_df[(series >= lower_bound) & (series <= upper_bound)]
                    
            elif operation == "standardize_text" and col in cleaned_df.columns:
                series = cleaned_df[col].astype(str)
                if strategy == "trim":
                    cleaned_df[col] = series.str.strip()
                elif strategy == "lowercase":
                    cleaned_df[col] = series.str.strip().str.lower()
                elif strategy == "uppercase":
                    cleaned_df[col] = series.str.strip().str.upper()
                elif strategy == "title":
                    cleaned_df[col] = series.str.strip().str.title()
                    
            elif operation == "convert_type" and col in cleaned_df.columns:
                if target_type == "int":
                    cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors='coerce').fillna(0).astype(int)
                elif target_type == "float":
                    cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors='coerce')
                elif target_type == "datetime":
                    cleaned_df[col] = pd.to_datetime(cleaned_df[col], errors='coerce')
                elif target_type == "string":
                    cleaned_df[col] = cleaned_df[col].astype(str)
                    
        after_stats = {
            "row_count": len(cleaned_df),
            "col_count": len(cleaned_df.columns),
            "duplicate_rows": int(cleaned_df.duplicated().sum()),
            "missing_cells": int(cleaned_df.isna().sum().sum()),
            "columns": {c: int(cleaned_df[c].isna().sum()) for c in cleaned_df.columns}
        }
        
        return cleaned_df, before_stats, after_stats

