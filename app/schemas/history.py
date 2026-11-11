from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ActivityLogResponse(BaseModel):
    id: str
    user_id: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

