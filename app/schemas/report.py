from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ReportGenerateRequest(BaseModel):
    project_id: str
    dataset_id: str
    title: str
    format: str = "pdf"  # pdf, excel, csv
    include_sections: Optional[list[str]] = None

class ReportResponse(BaseModel):
    id: str
    project_id: str
    dataset_id: str
    title: str
    format: str
    file_path: str
    sections: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

