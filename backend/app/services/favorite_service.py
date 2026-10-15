from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
import uuid

from app.models.chat import Message, MessageFavorite
from app.schemas.favorite import FavoriteCreate, FavoriteResponse


class FavoriteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_favorite(
        self,
        user_id: str,
        message_id: str,
    ) -> Optional[FavoriteResponse]:
        message = await self.db.execute(
            select(Message).where(Message.id == message_id)
        )
        message = message.scalar_one_or_none()
        
        if not message:
            return None
        
        existing = await self.db.execute(
            select(MessageFavorite).where(
                MessageFavorite.user_id == user_id,
                MessageFavorite.message_id == message_id
            )
        )
        if existing.scalar_one_or_none():
            return await self.get_favorite_by_message(user_id, message_id)
        
        favorite = MessageFavorite(
            id=str(uuid.uuid4()),
            user_id=user_id,
            message_id=message_id
        )
        self.db.add(favorite)
        await self.db.flush()
        
        return FavoriteResponse(
            id=favorite.id,
            user_id=user_id,
            message_id=message_id,
            message_content=message.content,
            session_id=message.session_id,
            created_at=favorite.created_at,
        )

    async def remove_favorite(
        self,
        user_id: str,
        message_id: str,
    ) -> bool:
        favorite = await self.db.execute(
            select(MessageFavorite).where(
                MessageFavorite.user_id == user_id,
                MessageFavorite.message_id == message_id
            )
        )
        favorite = favorite.scalar_one_or_none()
        
        if not favorite:
            return False
        
        await self.db.delete(favorite)
        await self.db.flush()
        
        return True

    async def get_favorites(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[FavoriteResponse], int]:
        offset = (page - 1) * page_size
        
        count_result = await self.db.execute(
            select(func.count(MessageFavorite.id))
            .where(MessageFavorite.user_id == user_id)
        )
        total = count_result.scalar() or 0
        
        result = await self.db.execute(
            select(MessageFavorite)
            .where(MessageFavorite.user_id == user_id)
            .order_by(desc(MessageFavorite.created_at))
            .offset(offset)
            .limit(page_size)
        )
        favorites = list(result.scalars().all())
        
        favorite_responses = []
        for fav in favorites:
            message = await self.db.execute(
                select(Message).where(Message.id == fav.message_id)
            )
            message = message.scalar_one_or_none()
            
            if message:
                favorite_responses.append(
                    FavoriteResponse(
                        id=fav.id,
                        user_id=user_id,
                        message_id=fav.message_id,
                        message_content=message.content,
                        session_id=message.session_id,
                        created_at=fav.created_at,
                    )
                )
        
        return favorite_responses, total

    async def get_favorite_by_message(
        self,
        user_id: str,
        message_id: str,
    ) -> Optional[FavoriteResponse]:
        favorite = await self.db.execute(
            select(MessageFavorite).where(
                MessageFavorite.user_id == user_id,
                MessageFavorite.message_id == message_id
            )
        )
        favorite = favorite.scalar_one_or_none()
        
        if not favorite:
            return None
        
        message = await self.db.execute(
            select(Message).where(Message.id == message_id)
        )
        message = message.scalar_one_or_none()
        
        if not message:
            return None
        
        return FavoriteResponse(
            id=favorite.id,
            user_id=user_id,
            message_id=message_id,
            message_content=message.content,
            session_id=message.session_id,
            created_at=favorite.created_at,
        )

    async def is_favorite(self, user_id: str, message_id: str) -> bool:
        favorite = await self.db.execute(
            select(MessageFavorite).where(
                MessageFavorite.user_id == user_id,
                MessageFavorite.message_id == message_id
            )
        )
        return favorite.scalar_one_or_none() is not None
