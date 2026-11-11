import pytest
import pandas as pd
from app.database.session import DuckDBManager

def test_duckdb_safe_query(tmp_path):
    df = pd.DataFrame({"category": ["A", "B", "A", "C"], "sales": [100, 200, 150, 300]})
    mgr = DuckDBManager()
    
    query = "SELECT category, SUM(sales) as total_sales FROM test_df GROUP BY category ORDER BY total_sales DESC"
    cols, rows = mgr.execute_safe_query(query, registered_tables={"test_df": df})
    
    assert cols == ["category", "total_sales"]
    assert len(rows) == 3
    assert rows[0][0] == "C"
    assert rows[0][1] == 300

def test_duckdb_blocks_forbidden_commands():
    mgr = DuckDBManager()
    dangerous_queries = [
        "DROP TABLE users",
        "DELETE FROM dataset WHERE 1=1",
        "INSERT INTO table VALUES (1, 2)",
        "ALTER TABLE data ADD COLUMN secret VARCHAR",
        "COPY dataset TO 'stolen.csv'"
    ]
    
    for q in dangerous_queries:
        with pytest.raises(ValueError, match="Only read-only analytical queries"):
            mgr.execute_safe_query(q)
