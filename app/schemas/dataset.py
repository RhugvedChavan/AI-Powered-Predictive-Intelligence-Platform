from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any

class DatasetColumnResponse(BaseModel):
    id: str
    name: str
    data_type: str
    raw_type: str
    null_count: int
    unique_count: int
    sample_values: list[Any] = []
    stats: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True

class DatasetResponse(BaseModel):
    id: str
    project_id: str
    name: str
    original_filename: str
    file_type: str
    row_count: int
    col_count: int
    file_size_bytes: int
    is_cleaned: bool
    parent_dataset_id: Optional[str] = None
    created_at: datetime
    columns: list[DatasetColumnResponse] = []
    summary: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True

class DatasetDetailResponse(DatasetResponse):
    pass

class DatasetPreviewResponse(BaseModel):
    dataset_id: str
    name: str
    total_rows: int
    total_columns: int
    columns: list[str]
    column_types: dict[str, str]
    rows: list[dict[str, Any]]

