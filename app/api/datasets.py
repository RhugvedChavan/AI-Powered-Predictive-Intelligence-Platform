import os
import shutil
import uuid
import json
import sqlite3
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.dataset import Dataset, DatasetColumn
from app.models.activity import ActivityLog
from app.schemas.dataset import DatasetResponse, DatasetDetailResponse, DatasetPreviewResponse
from app.analytics.profiler import profile_dataframe

router = APIRouter(prefix="/datasets", tags=["Datasets"])

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".sqlite", ".db", ".duckdb"}

@router.post("/upload", response_model=DatasetDetailResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    # 2. Assign project
    if not project_id:
        proj = db.query(Project).filter(Project.user_id == current_user.id).first()
        if not proj:
            proj = Project(user_id=current_user.id, name="Default Workspace")
            db.add(proj)
            db.commit()
            db.refresh(proj)
        project_id = proj.id

    # 3. Save uploaded file to disk
    dataset_id = str(uuid.uuid4())
    filename_clean = f"{dataset_id}_{file.filename}"
    file_path = str(settings.UPLOAD_DIR / filename_clean)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_size = os.path.getsize(file_path)
    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # 4. Parse dataset into DataFrame
    try:
        if ext == ".csv":
            df = pd.read_csv(file_path)
        elif ext in (".xlsx", ".xls"):
            df = pd.read_excel(file_path)
        elif ext in (".sqlite", ".db"):
            conn = sqlite3.connect(file_path)
            tables = pd.read_sql_query("SELECT name FROM sqlite_master WHERE type='table'", conn)
            if tables.empty:
                raise ValueError("SQLite database contains no tables.")
            first_table = tables.iloc[0]["name"]
            df = pd.read_sql_query(f'SELECT * FROM "{first_table}" LIMIT 100000', conn)
            conn.close()
        elif ext == ".duckdb":
            import duckdb
            d_con = duckdb.connect(file_path, read_only=True)
            tables = d_con.execute("SHOW TABLES").fetchall()
            if not tables:
                raise ValueError("DuckDB database contains no tables.")
            first_table = tables[0][0]
            df = d_con.execute(f'SELECT * FROM "{first_table}" LIMIT 100000').df()
            d_con.close()
        else:
            raise ValueError("Unsupported format.")
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse dataset file: {str(e)}"
        )

    # 5. Profile dataset
    overall_summary, column_profiles = profile_dataframe(df)

    # 6. Save Dataset record
    dataset_name = name or os.path.splitext(file.filename)[0]
    dataset = Dataset(
        id=dataset_id,
        project_id=project_id,
        user_id=current_user.id,
        name=dataset_name,
        original_filename=file.filename,
        file_type=ext.replace(".", ""),
        file_path=file_path,
        row_count=overall_summary["total_rows"],
        col_count=overall_summary["total_columns"],
        file_size_bytes=file_size,
        summary_json=json.dumps(overall_summary),
        is_cleaned=False
    )
    db.add(dataset)
    db.commit()

    # 7. Save Columns
    for col_info in column_profiles:
        col_rec = DatasetColumn(
            dataset_id=dataset.id,
            name=col_info["name"],
            data_type=col_info["data_type"],
            raw_type=col_info["raw_type"],
            null_count=col_info["null_count"],
            unique_count=col_info["unique_count"],
            sample_values_json=json.dumps(col_info["sample_values"]),
            stats_json=json.dumps(col_info["stats"])
        )
        db.add(col_rec)
        
    # 8. Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="upload",
        entity_type="dataset",
        entity_id=dataset.id,
        details_json=json.dumps({
            "name": dataset.name,
            "rows": dataset.row_count,
            "columns": dataset.col_count,
            "file_type": dataset.file_type
        })
    )
    db.add(log)
    db.commit()
    db.refresh(dataset)

    # Build response
    col_responses = []
    for c in dataset.columns:
        col_responses.append({
            "id": c.id,
            "name": c.name,
            "data_type": c.data_type,
            "raw_type": c.raw_type,
            "null_count": c.null_count,
            "unique_count": c.unique_count,
            "sample_values": json.loads(c.sample_values_json) if c.sample_values_json else [],
            "stats": json.loads(c.stats_json) if c.stats_json else None
        })

    return {
        "id": dataset.id,
        "project_id": dataset.project_id,
        "name": dataset.name,
        "original_filename": dataset.original_filename,
        "file_type": dataset.file_type,
        "row_count": dataset.row_count,
        "col_count": dataset.col_count,
        "file_size_bytes": dataset.file_size_bytes,
        "is_cleaned": dataset.is_cleaned,
        "parent_dataset_id": dataset.parent_dataset_id,
        "created_at": dataset.created_at,
        "columns": col_responses,
        "summary": json.loads(dataset.summary_json) if dataset.summary_json else None
    }

@router.get("", response_model=list[DatasetResponse])
def list_datasets(
    search: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Dataset).filter(Dataset.user_id == current_user.id)
    if project_id and isinstance(project_id, str):
        query = query.filter(Dataset.project_id == project_id)
    if search and isinstance(search, str):
        query = query.filter(Dataset.name.ilike(f"%{search}%"))
    return query.order_by(Dataset.created_at.desc()).all()

@router.get("/{dataset_id}", response_model=DatasetDetailResponse)
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    col_responses = []
    for c in dataset.columns:
        col_responses.append({
            "id": c.id,
            "name": c.name,
            "data_type": c.data_type,
            "raw_type": c.raw_type,
            "null_count": c.null_count,
            "unique_count": c.unique_count,
            "sample_values": json.loads(c.sample_values_json) if c.sample_values_json else [],
            "stats": json.loads(c.stats_json) if c.stats_json else None
        })

    return {
        "id": dataset.id,
        "project_id": dataset.project_id,
        "name": dataset.name,
        "original_filename": dataset.original_filename,
        "file_type": dataset.file_type,
        "row_count": dataset.row_count,
        "col_count": dataset.col_count,
        "file_size_bytes": dataset.file_size_bytes,
        "is_cleaned": dataset.is_cleaned,
        "parent_dataset_id": dataset.parent_dataset_id,
        "created_at": dataset.created_at,
        "columns": col_responses,
        "summary": json.loads(dataset.summary_json) if dataset.summary_json else None
    }

@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def preview_dataset(
    dataset_id: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset or not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    ext = os.path.splitext(dataset.file_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(dataset.file_path, nrows=limit + offset)
        df_slice = df.iloc[offset:offset+limit]
    elif ext in (".xlsx", ".xls"):
        df = pd.read_excel(dataset.file_path, nrows=limit + offset)
        df_slice = df.iloc[offset:offset+limit]
    else:
        df = pd.read_csv(dataset.file_path, nrows=limit + offset)
        df_slice = df.iloc[offset:offset+limit]

    # Convert non-serializable objects to string or float
    clean_rows = []
    for _, row in df_slice.iterrows():
        clean_row = {}
        for col in df_slice.columns:
            val = row[col]
            if pd.isna(val):
                clean_row[col] = None
            elif isinstance(val, (int, float, str, bool)):
                clean_row[col] = val
            else:
                clean_row[col] = str(val)
        clean_rows.append(clean_row)

    col_types = {c.name: c.data_type for c in dataset.columns}

    return {
        "dataset_id": dataset.id,
        "name": dataset.name,
        "total_rows": dataset.row_count,
        "total_columns": dataset.col_count,
        "columns": list(df.columns),
        "column_types": col_types,
        "rows": clean_rows
    }

@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Remove file on disk if exists
    if os.path.exists(dataset.file_path):
        try:
            os.remove(dataset.file_path)
        except Exception:
            pass

    db.delete(dataset)
    db.commit()
    return {"message": f"Dataset '{dataset.name}' successfully deleted."}
