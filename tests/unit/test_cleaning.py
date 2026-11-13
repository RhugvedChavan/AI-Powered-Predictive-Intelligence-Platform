import pandas as pd
import numpy as np
from app.cleaning.engine import DataCleaningEngine

def test_data_cleaning_detection():
    # Construct messy dataset
    data = {
        "A": [1, 2, 2, np.nan, 5, 1000],  # Outlier 1000, 1 missing, 1 duplicate pair
        "B": ["  apple  ", "banana", "banana", "cherry", "date", "fig"],
        "C": [10, 20, 20, 30, 40, 50]
    }
    df = pd.DataFrame(data)
    
    summary, recs = DataCleaningEngine.analyze_dataset(df)
    assert summary["duplicate_rows"] == 1
    assert summary["total_missing_cells"] == 1
    assert len(recs) >= 3

def test_data_cleaning_application():
    data = {
        "num": [10.0, 20.0, np.nan, 40.0, 20.0],
        "txt": [" test ", "alpha", "beta", "gamma", "alpha"]
    }
    df = pd.DataFrame(data)
    
    ops = [
        {"operation": "drop_duplicates"},
        {"operation": "fill_missing", "column": "num", "strategy": "mean"},
        {"operation": "standardize_text", "column": "txt", "strategy": "trim"}
    ]
    
    cleaned_df, before_stats, after_stats = DataCleaningEngine.apply_operations(df, ops)
    assert after_stats["duplicate_rows"] == 0
    assert after_stats["missing_cells"] == 0
    assert cleaned_df["txt"].iloc[0] == "test"

def test_auto_clean_dataframe():
    data = {
        " Customer Name ": [" Alice ", "Bob", "Alice ", np.nan, "Charlie"],
        " Revenue ($) ": ["$1,000", "$2,500.50", "$1,000", "$500", "N/A"],
        " Sign Date ": ["2024-01-01", "2024/02/15", "2024-01-01", "2024-03-10", "NULL"],
        "Blank_Col": [None, None, None, None, None]
    }
    df = pd.DataFrame(data)
    
    cleaned_df, ops, before_stats, after_stats = DataCleaningEngine.auto_clean_dataframe(df)
    
    # Verify column headers sanitized
    assert "customer_name" in cleaned_df.columns
    assert "revenue" in cleaned_df.columns
    assert "sign_date" in cleaned_df.columns
    assert "blank_col" not in cleaned_df.columns  # empty column dropped
    
    # Verify duplicates removed
    assert after_stats["duplicate_rows"] == 0
    
    # Verify missing values imputed
    assert after_stats["missing_cells"] == 0
    
    # Verify numeric cast
    assert pd.api.types.is_numeric_dtype(cleaned_df["revenue"])
    assert len(ops) >= 3


