from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, desc, func
from typing import Optional, List, Tuple
import uuid
import json

from app.models.graph import GraphSnapshot, GraphShare
from app.schemas.chat import Entity, Relation, GraphData


class GraphSnapshotService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_snapshot(
        self,
        user_id: str,
        session_id: str,
        message_id: str,
        graph_data: GraphData,
        entities: Optional[List[Entity]] = None,
        relations: Optional[List[Relation]] = None,
        keywords: Optional[List[str]] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
    ) -> GraphSnapshot:
        """创建图谱快照"""
        snapshot_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # 计算节点和边的数量
        node_count = len(graph_data.nodes) if hasattr(graph_data, 'nodes') else 0
        edge_count = len(graph_data.edges) if hasattr(graph_data, 'edges') else 0

        # 生成默认标题
        if not title and entities:
            if len(entities) == 1:
                title = f"{entities[0].name} 相关图谱"
            elif len(entities) <= 3:
                title = "、".join([e.name for e in entities]) + " 关系图谱"
            else:
                title = f"{entities[0].name} 等 {len(entities)} 个实体图谱"

        snapshot = GraphSnapshot(
            id=snapshot_id,
            user_id=user_id,
            session_id=session_id,
            message_id=message_id,
            graph_data=graph_data.model_dump() if hasattr(graph_data, 'model_dump') else graph_data,
            entities=[e.model_dump() if hasattr(e, 'model_dump') else e for e in (entities or [])],
            relations=[r.model_dump() if hasattr(r, 'model_dump') else r for r in (relations or [])],
            keywords=keywords or [],
            title=title,
            description=description,
            created_at=now,
            updated_at=now,
            node_count=node_count,
            edge_count=edge_count,
            is_shared=False,
        )

        self.db.add(snapshot)
        await self.db.commit()
        await self.db.refresh(snapshot)

        return snapshot

    async def get_snapshot(self, snapshot_id: str) -> Optional[GraphSnapshot]:
        """获取快照详情"""
        result = await self.db.execute(
            select(GraphSnapshot).where(GraphSnapshot.id == snapshot_id)
        )
        return result.scalar_one_or_none()

    async def get_user_snapshots(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[GraphSnapshot], int]:
        """获取用户快照列表"""
        query = select(GraphSnapshot).where(GraphSnapshot.user_id == user_id)

        if session_id:
            query = query.where(GraphSnapshot.session_id == session_id)

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # 分页查询
        query = query.order_by(desc(GraphSnapshot.created_at))
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        snapshots = result.scalars().all()

        return list(snapshots), total

    async def delete_snapshot(self, snapshot_id: str, user_id: str) -> bool:
        """删除快照"""
        result = await self.db.execute(
            select(GraphSnapshot).where(
                GraphSnapshot.id == snapshot_id,
                GraphSnapshot.user_id == user_id
            )
        )
        snapshot = result.scalar_one_or_none()

        if not snapshot:
            return False

        await self.db.delete(snapshot)
        await self.db.commit()
        return True

    async def share_snapshot(
        self,
        snapshot_id: str,
        user_id: str,
        expires_days: Optional[int] = 7,
    ) -> Optional[GraphShare]:
        """分享快照"""
        snapshot = await self.get_snapshot(snapshot_id)
        if not snapshot or snapshot.user_id != user_id:
            return None

        share_token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=expires_days) if expires_days else None

        share = GraphShare(
            snapshot_id=snapshot_id,
            user_id=user_id,
            share_token=share_token,
            expires_at=expires_at,
        )

        self.db.add(share)
        
        # 更新快照的分享状态
        snapshot.is_shared = True
        snapshot.share_token = share_token
        snapshot.share_expires_at = expires_at

        await self.db.commit()
        await self.db.refresh(share)

        return share

    async def get_shared_snapshot(
        self,
        share_token: str,
    ) -> Optional[GraphSnapshot]:
        """通过分享 token 获取快照"""
        result = await self.db.execute(
            select(GraphShare).where(
                GraphShare.share_token == share_token,
                GraphShare.is_active == True,
            )
        )
        share = result.scalar_one_or_none()

        if not share:
            return None

        # 检查是否过期
        if share.expires_at and share.expires_at < datetime.utcnow():
            share.is_active = False
            await self.db.commit()
            return None

        # 增加查看次数
        share.view_count += 1
        await self.db.commit()

        return await self.get_snapshot(share.snapshot_id)

    async def update_snapshot(
        self,
        snapshot_id: str,
        user_id: str,
        **updates,
    ) -> Optional[GraphSnapshot]:
        """更新快照"""
        snapshot = await self.get_snapshot(snapshot_id)
        if not snapshot or snapshot.user_id != user_id:
            return None

        for key, value in updates.items():
            if hasattr(snapshot, key):
                setattr(snapshot, key, value)

        snapshot.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(snapshot)

        return snapshot

    async def cancel_share(
        self,
        snapshot_id: str,
        user_id: str,
    ) -> bool:
        """取消分享"""
        snapshot = await self.get_snapshot(snapshot_id)
        if not snapshot or snapshot.user_id != user_id:
            return False

        snapshot.is_shared = False
        snapshot.share_token = None
        snapshot.share_expires_at = None

        # 删除所有分享记录
        await self.db.execute(
            delete(GraphShare).where(GraphShare.snapshot_id == snapshot_id)
        )

        await self.db.commit()
        return True
