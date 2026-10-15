from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class GraphSnapshot(Base):
    __tablename__ = "graph_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(String(36), nullable=False, index=True)
    
    # 图谱数据（JSON 格式）
    graph_data = Column(JSON, nullable=False)
    
    # 关联的实体和关系
    entities = Column(JSON, nullable=True)  # Entity 列表
    relations = Column(JSON, nullable=True)  # Relation 列表
    keywords = Column(JSON, nullable=True)  # 关键词列表
    
    # 元数据
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # 分享相关
    is_shared = Column(Boolean, default=False)
    share_token = Column(String(64), nullable=True, index=True)
    share_expires_at = Column(DateTime, nullable=True)
    
    # 统计信息
    node_count = Column(Integer, default=0)
    edge_count = Column(Integer, default=0)
    
    def __repr__(self):
        return f"<GraphSnapshot {self.id}: {self.title}>"


class GraphShare(Base):
    __tablename__ = "graph_shares"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    snapshot_id = Column(String(36), ForeignKey("graph_snapshots.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), nullable=False)
    share_token = Column(String(64), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    view_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    snapshot = relationship("GraphSnapshot", backref="shares")

    def __repr__(self):
        return f"<GraphShare {self.id}: {self.share_token}>"
