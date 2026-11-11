from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ChatQueryRequest(BaseModel):
    dataset_id: str
    message: str
    session_id: Optional[str] = None

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    agent_name: str
    content: str
    query_sql: Optional[str] = None
    execution_result: Optional[dict[str, Any]] = None
    chart_config: Optional[dict[str, Any]] = None
    agent_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: str
    dataset_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessageResponse] = []

    class Config:
        from_attributes = True

