from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class FavoriteBase(BaseModel):
    message_id: str = Field(..., description="消息ID")


class FavoriteCreate(FavoriteBase):
    pass


class FavoriteResponse(BaseModel):
    id: str
    user_id: str
    message_id: str
    message_content: Optional[str] = None
    session_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class FavoriteListResponse(BaseModel):
    favorites: list[FavoriteResponse]
    total: int
    page: int
    page_size: int
