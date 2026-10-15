import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./.pytest_app.db")
os.environ.setdefault("CORS_STRICT", "true")

import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models.chat import Message, MessageRole, Session
from app.models.graph import GraphShare, GraphSnapshot


@pytest_asyncio.fixture
async def async_session(tmp_path):
    db_path = tmp_path / "graph_service_test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        session.add(Session(id="test-session", user_id="test-user", title="测试会话"))
        session.add(
            Message(
                id="test-message",
                session_id="test-session",
                role=MessageRole.user,
                content="测试内容",
            )
        )
        await session.commit()
        yield session

    await engine.dispose()