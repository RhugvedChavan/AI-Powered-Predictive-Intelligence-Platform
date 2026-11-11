import pandas as pd
import numpy as np
from app.analytics.profiler import profile_dataframe, compute_correlation_matrix, recommend_visualizations

def test_profiler_column_detection():
    data = {
        "num": [1.0, 2.5, 3.8, 4.2, 5.0],
        "cat": ["North", "South", "East", "West", "North"],
        "dt": ["2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04", "2023-01-05"],
        "flag": [True, False, True, True, False]
    }
    df = pd.DataFrame(data)
    
    summary, columns = profile_dataframe(df)
    
    assert summary["total_rows"] == 5
    assert summary["total_columns"] == 4
    
    col_dict = {c["name"]: c for c in columns}
    assert col_dict["num"]["data_type"] == "numerical"
    assert col_dict["cat"]["data_type"] == "categorical"
    assert col_dict["dt"]["data_type"] == "datetime"
    assert col_dict["flag"]["data_type"] == "boolean"

def test_profiler_correlations_and_charts():
    np.random.seed(42)
    n = 50
    df = pd.DataFrame({
        "Revenue": np.random.uniform(100, 500, n),
        "Cost": np.random.uniform(50, 200, n),
        "Region": np.random.choice(["East", "West", "Central"], n)
    })
    
    corr = compute_correlation_matrix(df)
    assert "Revenue" in corr
    assert "Cost" in corr["Revenue"]
    
    summary, columns = profile_dataframe(df)
    recs = recommend_visualizations(df, columns)
    assert len(recs) >= 2
