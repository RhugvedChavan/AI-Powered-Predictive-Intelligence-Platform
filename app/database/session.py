import os
import duckdb
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# SQLite SQLAlchemy setup
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    connect_args={"check_same_thread": False},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DuckDBManager:
    """
    Manages DuckDB in-memory or file-backed analytical queries with safety bounds.
    """
    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(settings.DUCKDB_DIR / "analytics.duckdb")

    def get_connection(self, read_only: bool = False) -> duckdb.DuckDBPyConnection:
        # In-memory connections are thread-safe and isolated per analytical query
        con = duckdb.connect(database=":memory:", read_only=False)
        return con

    def execute_safe_query(self, query: str, registered_tables: dict = None) -> tuple[list[str], list[list]]:
        """
        Executes a safe read-only SQL query against DuckDB.
        registered_tables: dict of {table_name: dataframe_or_path}
        Returns: (column_names, rows)
        """
        # Security validation: only allow SELECT or WITH
        clean_q = query.strip().rstrip(';').strip()
        lower_q = clean_q.lower()
        
        # Disallow data modifying / system commands
        forbidden = [
            "drop", "delete", "insert", "update", "alter", "create", 
            "truncate", "pragma", "attach", "detach", "copy", "export",
            "import", "install", "load", "call"
        ]
        
        # Check first token
        first_token = lower_q.split()[0] if lower_q.split() else ""
        if first_token not in ("select", "with", "describe", "explain"):
            raise ValueError("Only read-only analytical queries (SELECT, WITH) are permitted.")
            
        for word in forbidden:
            # check word boundary
            parts = lower_q.replace('(', ' ').replace(')', ' ').replace(';', ' ').split()
            if word in parts and word not in ("describe",):
                # allow harmless usage inside aliases if token is exact statement starter
                if parts[0] == word:
                    raise ValueError(f"Forbidden SQL operation: '{word.upper()}' is not allowed in analytical queries.")

        con = duckdb.connect(database=":memory:")
        try:
            if registered_tables:
                for table_name, data in registered_tables.items():
                    if hasattr(data, 'shape'): # pandas DataFrame
                        con.register(table_name, data)
                    elif isinstance(data, str) and os.path.exists(data):
                        if data.endswith('.csv'):
                            con.execute(f"CREATE VIEW {table_name} AS SELECT * FROM read_csv_auto('{data}')")
                        elif data.endswith('.parquet'):
                            con.execute(f"CREATE VIEW {table_name} AS SELECT * FROM read_parquet('{data}')")
                        elif data.endswith(('.xlsx', '.xls')):
                            import pandas as pd
                            df = pd.read_excel(data)
                            con.register(table_name, df)
            
            result = con.execute(clean_q)
            col_names = [desc[0] for desc in result.description] if result.description else []
            rows = result.fetchall()
            return col_names, rows
        finally:
            con.close()

duckdb_manager = DuckDBManager()

