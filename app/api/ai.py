import os
import uuid
import json
import pandas as pd
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.models.chat import ChatSession, ChatMessage
from app.models.activity import ActivityLog
from app.schemas.chat import ChatQueryRequest, ChatMessageResponse, ChatSessionResponse
from app.agents.orchestrator import MultiAgentOrchestrator
from app.api.cleaning import load_dataset_df
from app.database.session import duckdb_manager

router = APIRouter(prefix="/ai", tags=["AI Data Assistant"])

@router.post("/chat", response_model=ChatMessageResponse)
def chat_with_data(
    req: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    
    # Get or create chat session
    session = None
    if req.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == req.session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        session = ChatSession(
            id=str(uuid.uuid4()),
            dataset_id=dataset.id,
            user_id=current_user.id,
            title=req.message[:50]
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 1. Save user message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role="user",
        agent_name="User",
        content=req.message,
        agent_status="completed"
    )
    db.add(user_msg)

    # 2. Run multi-agent orchestration
    # Agents cooperate: Data Analyst parses intent -> safe SQL -> DuckDB executes -> Visualization agent builds charts
    analysis_result = MultiAgentOrchestrator.process_nl_query(req.message, df, table_name="dataset")
    
    # 3. Save assistant message
    asst_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role="assistant",
        agent_name="Data Analyst Agent",
        content=analysis_result["explanation"],
        query_sql=analysis_result["query_sql"],
        execution_result_json=json.dumps(analysis_result["execution_result"]),
        chart_config_json=json.dumps(analysis_result["chart_config"]),
        agent_status="completed"
    )
    db.add(asst_msg)

    # Log activity
    log = ActivityLog(
        user_id=current_user.id,
        action="ask_ai",
        entity_type="chat",
        entity_id=session.id,
        details_json=json.dumps({
            "dataset_id": dataset.id,
            "query": req.message[:100],
            "chart_type": analysis_result["chart_config"]["chart_type"]
        })
    )
    db.add(log)
    db.commit()
    db.refresh(asst_msg)

    return {
        "id": asst_msg.id,
        "session_id": asst_msg.session_id,
        "role": asst_msg.role,
        "agent_name": asst_msg.agent_name,
        "content": asst_msg.content,
        "query_sql": asst_msg.query_sql,
        "execution_result": json.loads(asst_msg.execution_result_json) if asst_msg.execution_result_json else None,
        "chart_config": json.loads(asst_msg.chart_config_json) if asst_msg.chart_config_json else None,
        "agent_status": asst_msg.agent_status,
        "created_at": asst_msg.created_at
    }

@router.post("/query")
def execute_direct_query(
    dataset_id: str,
    sql: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    df = load_dataset_df(dataset)
    try:
        col_names, rows = duckdb_manager.execute_safe_query(sql, {"dataset": df})
        data = [dict(zip(col_names, row)) for row in rows]
        return {
            "status": "success",
            "columns": col_names,
            "rows": data[:100],
            "total_rows": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history", response_model=list[ChatSessionResponse])
def get_chat_history(
    dataset_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ChatSession).filter(ChatSession.user_id == current_user.id)
    if dataset_id:
        query = query.filter(ChatSession.dataset_id == dataset_id)
    sessions = query.order_by(ChatSession.updated_at.desc()).all()
    
    res = []
    for s in sessions:
        msgs = []
        for m in s.messages:
            msgs.append({
                "id": m.id,
                "session_id": m.session_id,
                "role": m.role,
                "agent_name": m.agent_name,
                "content": m.content,
                "query_sql": m.query_sql,
                "execution_result": json.loads(m.execution_result_json) if m.execution_result_json else None,
                "chart_config": json.loads(m.chart_config_json) if m.chart_config_json else None,
                "agent_status": m.agent_status,
                "created_at": m.created_at
            })
        res.append({
            "id": s.id,
            "dataset_id": s.dataset_id,
            "title": s.title,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "messages": msgs
        })
    return res

