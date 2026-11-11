from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class KPIDefinition(BaseModel):
    id: str
    title: str
    column: Optional[str] = None
    aggregation: str  # sum, avg, count, min, max, unique
    value: Any
    format: str = "number"  # currency, percentage, number
    change_pct: Optional[float] = None
    subtitle: Optional[str] = None

class DashboardCreateRequest(BaseModel):
    project_id: str
    dataset_id: str
    name: str
    description: Optional[str] = None
    kpis: list[dict[str, Any]] = []
    charts: list[dict[str, Any]] = []
    layout: Optional[dict[str, Any]] = None

class DashboardResponse(BaseModel):
    id: str
    project_id: str
    dataset_id: str
    name: str
    description: Optional[str] = None
    kpis: list[dict[str, Any]] = []
    charts: list[dict[str, Any]] = []
    layout: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class KPISummaryResponse(BaseModel):
    dataset_id: str
    suggested_kpis: list[KPIDefinition]

