from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.datasets import router as datasets_router
from app.api.cleaning import router as cleaning_router
from app.api.analysis import router as analysis_router
from app.api.ai import router as ai_router
from app.api.ml import router as ml_router
from app.api.bi import router as bi_router
from app.api.reports import router as reports_router
from app.api.history import router as history_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(datasets_router)
api_router.include_router(cleaning_router)
api_router.include_router(analysis_router)
api_router.include_router(ai_router)
api_router.include_router(ml_router)
api_router.include_router(bi_router)
api_router.include_router(reports_router)
api_router.include_router(history_router)

