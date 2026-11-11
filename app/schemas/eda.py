from pydantic import BaseModel
from typing import Optional, Any

class DescriptiveStat(BaseModel):
    column: str
    data_type: str
    count: int
    missing: int
    missing_pct: float
    unique: int
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    q25: Optional[float] = None
    median: Optional[float] = None
    q75: Optional[float] = None
    max: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    top_values: Optional[list[dict[str, Any]]] = None

class EDASummaryResponse(BaseModel):
    dataset_id: str
    row_count: int
    col_count: int
    statistics: list[DescriptiveStat]
    correlations: Optional[dict[str, dict[str, float]]] = None
    missing_matrix: dict[str, int]
    recommended_charts: list[dict[str, Any]]

