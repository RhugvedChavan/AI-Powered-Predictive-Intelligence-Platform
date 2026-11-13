import re
import warnings
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

    @staticmethod
    def auto_clean_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
        """
        Performs fully automated end-to-end data cleaning, column standardization,
        placeholder replacement, missing value imputation, deduplication, and tabular formatting.
        Returns: (cleaned_df, applied_operations, before_stats, after_stats)
        """
        cleaned_df = df.copy()
        applied_ops: list[dict[str, Any]] = []

        before_stats = {
            "row_count": len(df),
            "col_count": len(df.columns),
            "duplicate_rows": int(df.duplicated().sum()),
            "missing_cells": int(df.isna().sum().sum()),
            "columns": {str(c): int(df[c].isna().sum()) for c in df.columns}
        }

        # 1. Clean & Standardize Column Headers
        new_cols = []
        for i, col in enumerate(cleaned_df.columns):
            c_str = str(col).strip()
            c_clean = re.sub(r'[\s\W]+', '_', c_str).strip('_').lower()
            if not c_clean:
                c_clean = f"column_{i+1}"
            new_cols.append(c_clean)

        unique_cols = []
        counts: dict[str, int] = {}
        for c in new_cols:
            if c in counts:
                counts[c] += 1
                unique_cols.append(f"{c}_{counts[c]}")
            else:
                counts[c] = 0
                unique_cols.append(c)

        if list(cleaned_df.columns) != unique_cols:
            cleaned_df.columns = unique_cols
            applied_ops.append({
                "operation": "standardize_headers",
                "column": None,
                "strategy": "clean_snake_case",
                "custom_value": None,
                "target_type": None
            })

        # 2. Drop completely empty columns
        empty_cols = [c for c in cleaned_df.columns if cleaned_df[c].isna().all()]
        if empty_cols:
            cleaned_df = cleaned_df.drop(columns=empty_cols)
            for ec in empty_cols:
                applied_ops.append({
                    "operation": "drop_columns",
                    "column": ec,
                    "strategy": "drop_empty_column",
                    "custom_value": None,
                    "target_type": None
                })

        # 3. Drop completely empty rows
        init_rows = len(cleaned_df)
        cleaned_df = cleaned_df.dropna(how="all")
        if len(cleaned_df) < init_rows:
            applied_ops.append({
                "operation": "drop_empty_rows",
                "column": None,
                "strategy": "drop_blank_rows",
                "custom_value": None,
                "target_type": None
            })

        # 4. Clean, strip whitespace, and normalize text/data types
        placeholder_regex = r'^\s*(?i:n/a|na|null|none|nil|-|--|\?)\s*$'
        for col in cleaned_df.columns:
            s = cleaned_df[col]
            if s.dtype == 'object':
                s_stripped = s.astype(str).str.strip()
                s_cleaned = s_stripped.replace(to_replace=placeholder_regex, value=np.nan, regex=True)
                s_cleaned = s_cleaned.mask(s_cleaned.isin(['nan', 'NaN', 'None', 'NULL', 'null', '']), np.nan)

                # Check if formatted currency or numeric string
                cleaned_numeric = s_cleaned.str.replace(r'[\$,€£¥%]', '', regex=True).str.replace(',', '', regex=False)
                num_converted = pd.to_numeric(cleaned_numeric, errors='coerce')
                valid_num_count = int(num_converted.notna().sum())
                non_null_count = int(s_cleaned.notna().sum())

                if non_null_count > 0 and (valid_num_count / non_null_count) >= 0.8:
                    cleaned_df[col] = num_converted
                    applied_ops.append({
                        "operation": "convert_type",
                        "column": col,
                        "strategy": "currency_numeric_cast",
                        "custom_value": None,
                        "target_type": "float"
                    })
                else:
                    # Check if date
                    try:
                        with warnings.catch_warnings():
                            warnings.simplefilter("ignore")
                            date_converted = pd.to_datetime(s_cleaned, errors='coerce')
                        valid_date_count = int(date_converted.notna().sum())
                        if non_null_count > 0 and (valid_date_count / non_null_count) >= 0.8 and 'id' not in col:
                            cleaned_df[col] = date_converted.dt.strftime('%Y-%m-%d')
                            applied_ops.append({
                                "operation": "standardize_text",
                                "column": col,
                                "strategy": "iso_date_format",
                                "custom_value": None,
                                "target_type": "date"
                            })
                        else:
                            cleaned_df[col] = s_cleaned
                    except Exception:
                        cleaned_df[col] = s_cleaned

        # 5. Deduplicate rows (post whitespace & type normalization)
        dup_count = int(cleaned_df.duplicated().sum())
        if dup_count > 0:
            cleaned_df = cleaned_df.drop_duplicates()
            applied_ops.append({
                "operation": "drop_duplicates",
                "column": None,
                "strategy": "drop",
                "custom_value": None,
                "target_type": None
            })

        # 6. Impute remaining missing values
        for col in cleaned_df.columns:
            s = cleaned_df[col]
            null_count = int(s.isna().sum())
            if null_count > 0:
                if pd.api.types.is_numeric_dtype(s):
                    med = s.median()
                    if pd.notna(med):
                        val = int(med) if (s.dropna() % 1 == 0).all() else round(float(med), 2)
                        cleaned_df[col] = s.fillna(val)
                        applied_ops.append({
                            "operation": "fill_missing",
                            "column": col,
                            "strategy": "median",
                            "custom_value": float(val),
                            "target_type": None
                        })
                else:
                    mode_val = s.mode()
                    fill_val = mode_val.iloc[0] if not mode_val.empty else "Unknown"
                    cleaned_df[col] = s.fillna(fill_val)
                    applied_ops.append({
                        "operation": "fill_missing",
                        "column": col,
                        "strategy": "mode",
                        "custom_value": str(fill_val),
                        "target_type": None
                    })

        # Final deduplication check if imputation resulted in identical rows
        if cleaned_df.duplicated().sum() > 0:
            cleaned_df = cleaned_df.drop_duplicates()

        cleaned_df = cleaned_df.reset_index(drop=True)

        after_stats = {
            "row_count": len(cleaned_df),
            "col_count": len(cleaned_df.columns),
            "duplicate_rows": int(cleaned_df.duplicated().sum()),
            "missing_cells": int(cleaned_df.isna().sum().sum()),
            "columns": {str(c): int(cleaned_df[c].isna().sum()) for c in cleaned_df.columns}
        }

        return cleaned_df, applied_ops, before_stats, after_stats


