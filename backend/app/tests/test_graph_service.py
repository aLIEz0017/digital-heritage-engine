import pytest
import asyncio
from datetime import datetime
from app.services.graph_service import GraphSnapshotService
from app.models.graph import GraphSnapshot, GraphShare
from app.schemas.chat import Entity, GraphData, GraphNode, GraphEdge


class TestGraphSnapshotService:
    @pytest.mark.asyncio
    async def test_create_snapshot(self, async_session):
        """测试创建图谱快照"""
        service = GraphSnapshotService(async_session)
        
        graph_data = GraphData(
            nodes=[
                GraphNode(id="1", name="节点 1", category="technique"),
                GraphNode(id="2", name="节点 2", category="technique"),
            ],
            edges=[
                GraphEdge(source="1", target="2")
            ]
        )
        
        snapshot = await service.create_snapshot(
            user_id="test-user",
            session_id="test-session",
            message_id="test-message",
            graph_data=graph_data,
            title="测试快照",
        )
        
        assert snapshot is not None
        assert snapshot.id is not None
        assert snapshot.user_id == "test-user"
        assert snapshot.title == "测试快照"
        assert snapshot.node_count == 2
        assert snapshot.edge_count == 1

    @pytest.mark.asyncio
    async def test_get_snapshot(self, async_session):
        """测试获取快照"""
        service = GraphSnapshotService(async_session)
        
        # 创建测试快照
        created = await service.create_snapshot(
            user_id="test-user",
            session_id="test-session",
            message_id="test-message",
            graph_data=GraphData(nodes=[], edges=[]),
        )
        
        # 获取快照
        retrieved = await service.get_snapshot(created.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.user_id == "test-user"

    @pytest.mark.asyncio
    async def test_get_user_snapshots(self, async_session):
        """测试获取用户快照列表"""
        service = GraphSnapshotService(async_session)
        
        # 创建多个快照
        for i in range(5):
            await service.create_snapshot(
                user_id="test-user",
                session_id="test-session",
                message_id=f"message-{i}",
                graph_data=GraphData(nodes=[], edges=[]),
            )
        
        # 获取列表
        snapshots, total = await service.get_user_snapshots(
            user_id="test-user",
            page=1,
            page_size=3,
        )
        
        assert len(snapshots) == 3
        assert total == 5

    @pytest.mark.asyncio
    async def test_delete_snapshot(self, async_session):
        """测试删除快照"""
        service = GraphSnapshotService(async_session)
        
        # 创建快照
        created = await service.create_snapshot(
            user_id="test-user",
            session_id="test-session",
            message_id="test-message",
            graph_data=GraphData(nodes=[], edges=[]),
        )
        
        # 删除快照
        success = await service.delete_snapshot(created.id, "test-user")
        assert success is True
        
        # 验证已删除
        retrieved = await service.get_snapshot(created.id)
        assert retrieved is None

    @pytest.mark.asyncio
    async def test_share_snapshot(self, async_session):
        """测试分享快照"""
        service = GraphSnapshotService(async_session)
        
        # 创建快照
        created = await service.create_snapshot(
            user_id="test-user",
            session_id="test-session",
            message_id="test-message",
            graph_data=GraphData(nodes=[], edges=[]),
        )
        
        # 分享快照
        share = await service.share_snapshot(
            snapshot_id=created.id,
            user_id="test-user",
            expires_days=7,
        )
        
        assert share is not None
        assert share.share_token is not None
        
        # 验证快照已更新
        updated = await service.get_snapshot(created.id)
        assert updated.is_shared is True
        assert updated.share_token == share.share_token

    @pytest.mark.asyncio
    async def test_get_shared_snapshot(self, async_session):
        """测试通过分享令牌获取快照"""
        service = GraphSnapshotService(async_session)
        
        # 创建并分享快照
        created = await service.create_snapshot(
            user_id="test-user",
            session_id="test-session",
            message_id="test-message",
            graph_data=GraphData(nodes=[], edges=[]),
        )
        
        share = await service.share_snapshot(
            snapshot_id=created.id,
            user_id="test-user",
            expires_days=7,
        )
        
        # 通过分享令牌获取
        retrieved = await service.get_shared_snapshot(share.share_token)
        
        assert retrieved is not None
        assert retrieved.id == created.id

    @pytest.mark.asyncio
    async def test_cancel_share(self, async_session):
        """测试取消分享"""
        service = GraphSnapshotService(async_session)
        
        # 创建并分享快照
        created = await service.create_snapshot(
            user_id="test-user",
            session_id="test-session",
            message_id="test-message",
            graph_data=GraphData(nodes=[], edges=[]),
        )
        
        await service.share_snapshot(
            snapshot_id=created.id,
            user_id="test-user",
            expires_days=7,
        )
        
        # 取消分享
        success = await service.cancel_share(created.id, "test-user")
        assert success is True
        
        # 验证已取消
        updated = await service.get_snapshot(created.id)
        assert updated.is_shared is False
        assert updated.share_token is None


class TestGraphSnapshotAutoTitle:
    @pytest.mark.asyncio
    async def test_auto_generate_title_from_entities(self, async_session):
        """测试从实体自动生成标题"""
        service = GraphSnapshotService(async_session)
        
        # 创建带实体的快照
        snapshot = await service.create_snapshot(
            user_id="test-user",
            session_id="test-session",
            message_id="test-message",
            graph_data=GraphData(nodes=[], edges=[]),
            entities=[Entity(id="entity-1", name="云锦", type="technique")],
        )
        
        assert snapshot.title is not None
        assert "云锦" in snapshot.title

    @pytest.mark.asyncio
    async def test_auto_generate_title_multiple_entities(self, async_session):
        """测试从多个实体生成标题"""
        service = GraphSnapshotService(async_session)
        
        snapshot = await service.create_snapshot(
            user_id="test-user",
            session_id="test-session",
            message_id="test-message",
            graph_data=GraphData(nodes=[], edges=[]),
            entities=[
                Entity(id="entity-1", name="云锦", type="technique"),
                Entity(id="entity-2", name="刺绣", type="technique"),
                Entity(id="entity-3", name="剪纸", type="technique"),
            ],
        )
        
        assert snapshot.title is not None
        assert "等 3 个实体图谱" in snapshot.title or "云锦" in snapshot.title
