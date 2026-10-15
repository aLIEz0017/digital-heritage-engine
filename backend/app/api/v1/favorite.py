from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_user
from app.schemas.favorite import FavoriteCreate, FavoriteResponse, FavoriteListResponse
from app.services.favorite_service import FavoriteService


router = APIRouter(prefix="/api/v1/favorites", tags=["favorites"])


@router.get("", response_model=FavoriteListResponse, summary="获取用户收藏的所有消息")
async def get_favorites(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    service = FavoriteService(db)
    favorites, total = await service.get_favorites(user_id, page, page_size)
    
    return FavoriteListResponse(
        favorites=favorites,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{message_id}", response_model=FavoriteResponse, summary="收藏消息")
async def add_favorite(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    service = FavoriteService(db)
    favorite = await service.add_favorite(user_id, message_id)
    
    if not favorite:
        raise HTTPException(status_code=404, detail="消息不存在")
    
    return favorite


@router.delete("/{message_id}", summary="取消收藏消息")
async def remove_favorite(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    service = FavoriteService(db)
    success = await service.remove_favorite(user_id, message_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="收藏不存在")
    
    return {"success": True}


@router.get("/{message_id}/check", summary="检查消息是否已收藏")
async def check_favorite(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_optional_user),
):
    if user_id is None:
        return {"is_favorite": False}
        
    service = FavoriteService(db)
    is_favorite = await service.is_favorite(user_id, message_id)
    
    return {"is_favorite": is_favorite}
