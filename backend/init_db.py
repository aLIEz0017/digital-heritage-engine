"""
初始化数据库，创建所有表
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.database import Base, DATABASE_URL
from app.models.chat import Session, Message, MessageSource, MessageEntity
from app.models.knowledge import Entity, Relationship

async def init_db():
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ 数据库表创建成功")
    print("✅ 包含表：sessions, messages, message_sources, message_entities, entities, relationships")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_db())
