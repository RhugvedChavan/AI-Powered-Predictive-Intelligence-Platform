from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class CleaningOperation(BaseModel):
    operation: str  # drop_duplicates, fill_missing, drop_columns, handle_outliers, convert_type, standardize_text
    column: Optional[str] = None
    strategy: Optional[str] = None  # mean, median, mode, custom, drop, iqr_clip, zscore_clip, lowercase, trim
    custom_value: Optional[Any] = None
    target_type: Optional[str] = None  # int, float, string, datetime

class CleaningRecommendation(BaseModel):
    issue_type: str  # missing_values, duplicates, outliers, inconsistent_types, high_cardinality, constant_column
    column: Optional[str] = None
    description: str
    severity: str  # low, medium, high
    affected_count: int
    recommended_operation: CleaningOperation

class CleaningAnalysisResponse(BaseModel):
    dataset_id: str
    total_rows: int
    total_columns: int
    duplicate_rows_count: int
    missing_cells_count: int
    recommendations: list[CleaningRecommendation]
    column_quality_summary: dict[str, Any]

class CleaningApplyRequest(BaseModel):
    dataset_id: str
    operations: list[CleaningOperation]
    new_dataset_name: Optional[str] = None

class AutoCleanRequest(BaseModel):
    dataset_id: str
    new_dataset_name: Optional[str] = None

class CleaningJobResponse(BaseModel):
    id: str
    dataset_id: str
    cleaned_dataset_id: Optional[str] = None
    status: str
    operations: list[CleaningOperation]
    before_stats: dict[str, Any]
    after_stats: dict[str, Any]
    created_at: datetime

