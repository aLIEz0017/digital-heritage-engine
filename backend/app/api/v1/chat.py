from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib
import json
import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any, Optional, Set

from app.core.database import get_db
from app.core.auth import get_current_user, get_current_or_guest
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    SessionCreate,
    SessionUpdate,
    Session as SessionSchema,
    SessionListResponse,
    MessageListResponse,
    Message as MessageSchema,
    FeedbackRequest,
    FavoriteResponse,
    RecommendedQuestion,
    Source,
    Entity,
    EntityType,
    Relation,
    RelationType,
    RecommendationRequest,
)
from app.services.chat_service import SessionService, MessageService
from app.services.llm_service import llm_service
from app.services.source_retrieval import retrieve_sources_from_knowledge
from app.services.question_generator import question_generator
from app.models.chat import MessageEntity, MessageRole

router = APIRouter(prefix="/api/v1", tags=["chat"])
logger = logging.getLogger(__name__)


def _entity_type_str(t: Any) -> str:
    return t.value if hasattr(t, "value") else str(t)


def _entity_canon_key(name: str, type_str: str) -> str:
    return f"{(name or '').strip().casefold()}|{type_str}"


def _message_entity_row_to_entity(row: MessageEntity) -> Entity:
    try:
        et = EntityType(row.type)
    except ValueError:
        et = EntityType.technique
    rel = (row.relevance / 100.0) if row.relevance is not None else None
    return Entity(
        id=row.id,
        name=row.name or "",
        type=et,
        description=row.description,
        relevance=rel,
    )


async def _load_session_first_seen_entities(
    message_service: MessageService,
    session_id: str,
    exclude_message_ids: Optional[Set[str]] = None,
) -> dict[str, Entity]:
    """按时间顺序，每个「名称+类型」首次出现的实体（用于跨轮 id 对齐）。"""
    messages = await message_service.get_recent_session_messages(
        session_id,
        limit=60,
        exclude_message_ids=exclude_message_ids,
    )
    first_seen: dict[str, Entity] = {}
    for msg in messages:
        if msg.role != MessageRole.assistant:
            continue
        for row in msg.entities or []:
            ent = _message_entity_row_to_entity(row)
            ck = _entity_canon_key(ent.name, _entity_type_str(ent.type))
            if ck not in first_seen:
                first_seen[ck] = ent
    return first_seen


def _align_entities_with_session(entities: list[Entity], first_seen: dict[str, Entity]) -> list[Entity]:
    aligned: list[Entity] = []
    for e in entities:
        ck = _entity_canon_key(e.name, _entity_type_str(e.type))
        prev_e = first_seen.get(ck)
        if prev_e is not None:
            aligned.append(e.model_copy(update={"id": prev_e.id}))
        else:
            aligned.append(e)
    return aligned


def _merge_entities_for_relation_extraction(
    aligned_current: list[Entity],
    first_seen: dict[str, Entity],
    cap: int = 45,
) -> list[Entity]:
    by_key: dict[str, Entity] = {k: v for k, v in first_seen.items()}
    for e in aligned_current:
        by_key[_entity_canon_key(e.name, _entity_type_str(e.type))] = e
    keys_cur = [_entity_canon_key(e.name, _entity_type_str(e.type)) for e in aligned_current]
    seen: set[str] = set()
    ordered: list[Entity] = []
    for k in keys_cur:
        if k not in seen and k in by_key:
            ordered.append(by_key[k])
            seen.add(k)
        if len(ordered) >= cap:
            return ordered
    for k, ent in by_key.items():
        if k in seen:
            continue
        ordered.append(ent)
        seen.add(k)
        if len(ordered) >= cap:
            break
    return ordered


def _build_relation_extraction_text(user_q: str, assistant_reply: str, first_seen: dict[str, Entity]) -> str:
    prior_lines = "\n".join(
        f"- {e.name}（{_entity_type_str(e.type)}）"
        for e in list(first_seen.values())[:28]
    )
    hint = ""
    if prior_lines:
        hint = (
            "\n\n【同会话最近已出现的实体】"
            "（用户可能在本轮继续追问这些概念；若与本轮实体有知识上的联系，请用 related_to 等类型连边。）\n"
            + prior_lines
        )
    return (
        f"【用户问题】\n{(user_q or '')[:500]}\n\n"
        f"【助手本轮回复】\n{(assistant_reply or '')[:1400]}"
        + hint
    )


def _build_entity_keyword_extraction_text(user_q: str, assistant_reply: str) -> str:
    """实体/关键词抽取必须同时看到用户问题与助手回答，否则换话题时易漏掉用户点名的项目（如木雕后再问汉绣）。"""
    u = (user_q or "").strip()[:900]
    a = (assistant_reply or "").strip()
    return f"【用户本轮问题】\n{u}\n\n【助手本轮回答】\n{a}"


_SEED_Q_STOP = frozenset(
    {
        "什么",
        "怎么",
        "如何",
        "哪些",
        "多少",
        "为什么",
        "介绍一下",
        "说说",
        "讲讲",
        "告诉我",
        "请问",
        "想问",
        "是不是",
        "可以",
        "能否",
        "有没有",
        "对吗",
    }
)


def _stable_seed_entity_id(canon_key: str) -> str:
    h = hashlib.md5(canon_key.encode("utf-8")).hexdigest()[:18]
    return f"seed_ent_{h}"


def _topic_candidates_from_text(text: str, limit: int = 8) -> list[str]:
    """从用户句或回答里抽 2–16 字片段，作保底节点/关键词候选。"""
    if not text or not text.strip():
        return []
    t = re.sub(r"\[[^\]]+\]\([^)]+\)", " ", text)
    t = re.sub(r"https?://\S+", " ", t)
    raw = re.findall(r"[\u4e00-\u9fffA-Za-z0-9·]{2,16}", t)
    out: list[str] = []
    seen: set[str] = set()
    for w in raw:
        w = w.strip()
        if len(w) < 2 or w in _SEED_Q_STOP:
            continue
        if w in seen:
            continue
        seen.add(w)
        out.append(w)
        if len(out) >= limit:
            break
    return out


def _seed_entities_if_empty(
    entities: list[Entity],
    user_q: str,
    assistant_text: str,
    first_seen: dict[str, Entity],
) -> list[Entity]:
    """LLM 未抽到实体时，用语义片段保底生成节点，保证每轮可上图谱。"""
    if entities:
        return list(entities)
    taken: set[str] = {
        _entity_canon_key(e.name, _entity_type_str(e.type)) for e in first_seen.values()
    }
    out: list[Entity] = []
    budget = 3
    for src in (user_q or "", assistant_text or ""):
        for phrase in _topic_candidates_from_text(src, limit=10):
            ck = _entity_canon_key(phrase, "technique")
            if ck in taken:
                continue
            taken.add(ck)
            out.append(
                Entity(
                    id=_stable_seed_entity_id(ck),
                    name=phrase,
                    type=EntityType.technique,
                    description="主题词保底节点（模型未返回实体时由系统补充）",
                    relevance=0.52,
                )
            )
            budget -= 1
            if budget <= 0:
                return out
        if out:
            return out
    return out


def _seed_keywords_if_empty(keywords: list[str], user_q: str, assistant_text: str) -> list[str]:
    if keywords:
        return list(keywords)
    merged: list[str] = []
    seen: set[str] = set()
    for src in (user_q or "", assistant_text or ""):
        for w in _topic_candidates_from_text(src, limit=8):
            if w not in seen:
                seen.add(w)
                merged.append(w)
            if len(merged) >= 10:
                return merged
    return merged


def _deduplicate_entities_list(entities: list[Entity]) -> list[Entity]:
    """同轮内按名称+类型合并；与关系抽取前调用，避免边挂在被丢弃的 id 上。"""
    if not entities:
        return []
    seen: dict[str, Entity] = {}
    for entity in entities:
        key = f"{entity.name.lower().strip()}_{_entity_type_str(entity.type)}"
        if key not in seen:
            seen[key] = entity
        else:
            existing = seen[key]
            if entity.description and not existing.description:
                existing.description = entity.description
            if entity.relevance and (
                not existing.relevance or entity.relevance > existing.relevance
            ):
                existing.relevance = entity.relevance
            if entity.importance and (
                not existing.importance or entity.importance > existing.importance
            ):
                existing.importance = entity.importance
    return list(seen.values())


def _deduplicate_relations_list(relations: list[Relation]) -> list[Relation]:
    if not relations:
        return []
    seen: dict[str, Relation] = {}
    for relation in relations:
        key = f"{relation.source}_{relation.target}_{relation.type}"
        if key not in seen:
            seen[key] = relation
        else:
            existing = seen[key]
            if relation.confidence and (
                not existing.confidence or relation.confidence > existing.confidence
            ):
                existing.confidence = relation.confidence
    return list(seen.values())


async def _finalize_chat_round_graph(
    message_service: MessageService,
    session_id: str,
    user_q: str,
    assistant_text: str,
    entities: list[Entity],
    keywords: list[str],
    *,
    exclude_message_ids: Optional[Set[str]] = None,
) -> tuple[list[Entity], list[str], list[Relation]]:
    """
    每轮问答统一：会话内 id 对齐 → 同轮实体去重 → 空则保底节点/词
    → 关系抽取（合并本会话已有实体，重复则沿用 id，边接到已有节点）
    """
    first_seen = await _load_session_first_seen_entities(
        message_service, session_id, exclude_message_ids=exclude_message_ids
    )
    entities = _align_entities_with_session(entities, first_seen)
    entities = _deduplicate_entities_list(entities)
    entities = _seed_entities_if_empty(entities, user_q, assistant_text, first_seen)
    entities = _align_entities_with_session(entities, first_seen)
    entities = _deduplicate_entities_list(entities)
    keywords = _seed_keywords_if_empty(keywords, user_q, assistant_text)

    merged = _merge_entities_for_relation_extraction(entities, first_seen, cap=45)
    rel_text = _build_relation_extraction_text(user_q, assistant_text, first_seen)
    relations: list[Relation] = []
    try:
        relations = await asyncio.wait_for(
            llm_service.extract_relations(rel_text, merged),
            timeout=90.0,
        )
        relations = _deduplicate_relations_list(relations)
    except Exception as relation_error:
        logger.warning("Relation extraction timeout or error: %s", relation_error)

    return entities, keywords, relations


# 常量定义
MAX_ENTITIES = 5
MAX_KEYWORDS = 5
STREAM_CHUNK_DELAY = 0.03

MOCK_SOURCES = [
    {
        "id": "1",
        "title": "《中国非物质文化遗产保护名录》",
        "content": "详细记录了国家级非遗项目的传承谱系、技艺特点和保护措施...",
        "page": 128,
        "relevance": 0.95,
    },
    {
        "id": "2",
        "title": "《地方志·传统技艺卷》",
        "content": "记载了传统技艺的历史渊源、发展脉络和地域特色...",
        "page": 56,
        "relevance": 0.88,
    },
]

HERITAGE_FALLBACK_RESPONSES = [
    "根据非遗知识库的资料，您询问的内容涉及传统技艺的核心传承。这项技艺已有数百年历史，是中华传统文化的重要组成部分。",
    "关于您的问题，从非遗保护的角度来看，这体现了先民智慧的结晶。传承人在技艺传承中扮演着关键角色，需要长期的学习和实践。",
    '这是一个很好的问题！非遗文化强调"活态传承"，每一代传承人都会在保持核心技艺的同时，融入时代特色。',
]


def parse_session_tags(session: Any) -> dict[str, Any]:
    """解析 Session 模型的 tags 字段"""
    session_dict = {c.name: getattr(session, c.name) for c in session.__table__.columns}
    if hasattr(session, 'tags') and session.tags:
        try:
            session_dict['tags'] = json.loads(session.tags) if isinstance(session.tags, str) else session.tags
        except (json.JSONDecodeError, TypeError):
            session_dict['tags'] = []
    else:
        session_dict['tags'] = []
    return session_dict


def generate_fallback_response(content: str) -> str:
    """生成降级响应"""
    lower_content = content.lower()
    
    if '传承人' in lower_content or '传人' in lower_content:
        return "传承人是非遗保护的核心。他们不仅掌握着精湛的技艺，更承载着文化的记忆。目前我国已建立了完善的传承人认定和保护机制，确保这些珍贵技艺得以延续。"
    
    if '历史' in lower_content or '起源' in lower_content:
        return "这项非遗技艺历史悠久，可追溯至数百年前。它凝聚了先民的智慧，在历史长河中不断发展演变，形成了独特的艺术风格。"
    
    if '工艺' in lower_content or '制作' in lower_content:
        return '该技艺的制作工艺十分讲究，需要经过多道工序，每一步都需要精心操作。传统工艺强调"慢工出细活"，体现了匠人精神。'
    
    import random
    return random.choice(HERITAGE_FALLBACK_RESPONSES)


def extract_fallback_keywords(content: str) -> list[str]:
    """提取关键词（降级版本）"""
    keywords = ['传承', '技艺', '非遗', '传统', '文化']
    result = []
    for kw in keywords:
        if kw in content and len(result) < MAX_KEYWORDS:
            result.append(kw)
    return result if result else ['非遗文化']


def extract_fallback_entities(content: str) -> list[dict]:
    """提取实体（降级版本）"""
    entities = []
    entity_map = {
        '传承人': ('inheritor', '非物质文化遗产传承人'),
        '技艺': ('technique', '传统技艺技法'),
        '工艺': ('technique', '传统制作工艺'),
        '历史': ('period', '历史时期背景'),
    }
    
    for i, (keyword, (etype, desc)) in enumerate(entity_map.items()):
        if keyword in content and len(entities) < MAX_ENTITIES:
            entities.append({
                "id": f"entity_{i+1}",
                "name": keyword,
                "type": etype,
                "description": desc,
                "relevance": 0.85,
            })
    
    return entities


class ChatError(Exception):
    """聊天服务异常"""
    def __init__(self, code: str, message: str, recoverable: bool = True):
        self.code = code
        self.message = message
        self.recoverable = recoverable
        super().__init__(message)


@router.get("/health")
async def health_check():
    """LLM服务健康检查端点"""
    try:
        state = llm_service.state.value
        is_healthy = state == "healthy"
        
        response = {
            "status": "healthy" if is_healthy else "degraded",
            "llm_state": state,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error_counts": llm_service.error_counts,
            "is_degraded": llm_service.is_degraded,
        }
        
        if llm_service.last_health_check:
            response["last_health_check"] = llm_service.last_health_check.isoformat()
            
        return response
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "error",
            "llm_state": "unknown",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }


@router.post("/chat/message", response_model=ChatMessageResponse)
async def send_message(
    request: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_or_guest),
):
    session_service = SessionService(db)
    message_service = MessageService(db)

    try:
        session = await session_service.get_session(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")

        # 处理文件 URL，将其附加到消息内容中
        user_content = request.content
        if request.file_urls:
            file_references = []
            for url in request.file_urls:
                filename = url.split('/')[-1] if '/' in url else url
                file_references.append(f"[文件: {filename}]({url})")
            user_content = f"{request.content}\n\n{' '.join(file_references)}"

        await message_service.create_message(
            session_id=request.session_id,
            content=user_content,
            role=MessageRole.user,
        )
        # 先提交用户消息，避免长时间 LLM 调用持有 SQLite 写锁
        await db.commit()

        ai_response = await llm_service.chat(user_content)
        extract_src = _build_entity_keyword_extraction_text(user_content, ai_response)
        entities = await llm_service.extract_entities(extract_src)
        keywords = await llm_service.extract_keywords(extract_src)
        entities, keywords, relations = await _finalize_chat_round_graph(
            message_service,
            request.session_id,
            user_content,
            ai_response,
            entities,
            keywords,
        )

        # 动态检索相关来源，替换硬编码的 MOCK_SOURCES
        sources = await retrieve_sources_from_knowledge(db, request.content, entities)

        ai_message = await message_service.create_message(
            session_id=request.session_id,
            content=ai_response,
            role=MessageRole.assistant,
            sources=sources,
            entities=entities,
            keywords=keywords,
            relations=relations,
        )

        return ChatMessageResponse(
            message_id=ai_message.id,
            content=ai_message.content,
            role=ai_message.role,
            sources=sources,
            entities=entities,
            keywords=keywords,
            created_at=ai_message.created_at.isoformat(),
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in send_message: {e}")
        raise HTTPException(status_code=500, detail=f"发送消息失败: {str(e)}")


@router.post("/chat/stream")
async def send_message_stream(
    request: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_or_guest),
):
    session_service = SessionService(db)
    message_service = MessageService(db)

    try:
        session = await session_service.get_session(request.session_id)
        if not session:
            print(f"⚠️ 流式接口发现未知的会话 ID: {request.session_id}，正在自动创建...")
            from app.models.chat import Session
            new_session = Session(
                id=request.session_id,
                user_id=user_id,
                title="新对话",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(new_session)
            await db.flush()
            session = new_session

        # 处理文件 URL，将其附加到消息内容中
        user_content = request.content
        if request.file_urls:
            file_references = []
            for url in request.file_urls:
                filename = url.split('/')[-1] if '/' in url else url
                file_references.append(f"[文件: {filename}]({url})")
            user_content = f"{request.content}\n\n{' '.join(file_references)}"

        if request.resume_from is None:
            await message_service.create_message(
                session_id=request.session_id,
                content=user_content,
                role=MessageRole.user,
            )
        # 关键：流式响应会长时间占用连接，先提交前置写入以释放 SQLite 写锁
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user message: {e}")
        raise HTTPException(status_code=500, detail=f"创建消息失败: {str(e)}")

    async def generate():
        full_content = ""
        accumulated_length = 0
        
        try:
            if request.resume_from is not None:
                yield (
                    "data: "
                    + json.dumps({"type": "resume", "offset": request.resume_from}, ensure_ascii=False)
                    + "\n\n"
                )
            
            async for chunk in llm_service.chat_stream(request.content):
                full_content += chunk
                accumulated_length += len(chunk)
                
                data = json.dumps({
                    "type": "content_chunk",
                    "content": chunk,
                    "accumulated_length": accumulated_length
                }, ensure_ascii=False)
                yield f"data: {data}\n\n"

            # 发送处理中状态，避免前端在抽取阶段误判流式超时
            yield "data: " + json.dumps({"type": "processing", "stage": "extract_start"}, ensure_ascii=False) + "\n\n"

            # 抽取阶段设置超时兜底，避免 complete 长时间不返回
            try:
                extract_src = _build_entity_keyword_extraction_text(user_content, full_content)
                entities, keywords = await asyncio.wait_for(
                    asyncio.gather(
                        llm_service.extract_entities(extract_src),
                        llm_service.extract_keywords(extract_src),
                    ),
                    timeout=90.0,
                )
            except Exception as extract_error:
                logger.warning(f"Entity/keyword extraction timeout or error: {extract_error}")
                entities = []
                keywords = []
                yield (
                    "data: "
                    + json.dumps(
                        {"type": "processing", "stage": "extract_failed", "message": str(extract_error)},
                        ensure_ascii=False,
                    )
                    + "\n\n"
                )

            # 真实抽取为空时做一次重试（不使用 mock）
            if full_content.strip() and len(entities) == 0:
                yield "data: " + json.dumps({"type": "processing", "stage": "extract_retry"}, ensure_ascii=False) + "\n\n"
                try:
                    retry_src = _build_entity_keyword_extraction_text(user_content, full_content)
                    retry_entities, retry_keywords = await asyncio.wait_for(
                        asyncio.gather(
                            llm_service.extract_entities(retry_src),
                            llm_service.extract_keywords(retry_src),
                        ),
                        timeout=60.0,
                    )
                    if retry_entities:
                        entities = retry_entities
                    if retry_keywords:
                        keywords = retry_keywords
                except Exception as retry_error:
                    logger.warning(f"Entity/keyword extraction retry failed: {retry_error}")
                    yield (
                        "data: "
                        + json.dumps(
                            {"type": "processing", "stage": "extract_retry_failed", "message": str(retry_error)},
                            ensure_ascii=False,
                        )
                        + "\n\n"
                    )

            yield "data: " + json.dumps({"type": "processing", "stage": "relation_start"}, ensure_ascii=False) + "\n\n"
            try:
                entities, keywords, relations = await _finalize_chat_round_graph(
                    message_service,
                    request.session_id,
                    user_content,
                    full_content,
                    entities,
                    keywords,
                )
            except Exception as relation_error:
                logger.warning("Graph finalize error: %s", relation_error)
                relations = []
                yield (
                    "data: "
                    + json.dumps(
                        {"type": "processing", "stage": "relation_failed", "message": str(relation_error)},
                        ensure_ascii=False,
                    )
                    + "\n\n"
                )

            if entities:
                entities_data = json.dumps({
                    "type": "entities",
                    "entities": [e.model_dump() for e in entities],
                    "is_incremental": False
                }, ensure_ascii=False)
                yield f"data: {entities_data}\n\n"

            if keywords:
                keywords_data = json.dumps({
                    "type": "keywords",
                    "keywords": list(dict.fromkeys(keywords))  # 关键词去重
                }, ensure_ascii=False)
                yield f"data: {keywords_data}\n\n"

            if relations:
                relations_data = json.dumps({
                    "type": "relations",
                    "relations": [r.model_dump() for r in relations]
                }, ensure_ascii=False)
                yield f"data: {relations_data}\n\n"

            # 动态检索相关来源，替换硬编码的 MOCK_SOURCES
            sources = await retrieve_sources_from_knowledge(db, request.content, entities)

            try:
                ai_message = await message_service.create_message(
                    session_id=request.session_id,
                    content=full_content,
                    role=MessageRole.assistant,
                    sources=sources,
                    entities=entities,
                    keywords=keywords,
                    relations=relations,
                )
                message_id = ai_message.id
            except Exception as db_error:
                logger.error(f"Error saving AI message: {db_error}")
                message_id = f"msg_{datetime.now(timezone.utc).timestamp()}"
                sources = []

            complete_data = json.dumps(
                {
                    "type": "complete",
                    "message_id": message_id,
                    "content": full_content,
                    "sources": [s.model_dump() for s in sources],
                    "entities": [e.model_dump() for e in entities],
                    "keywords": keywords,
                    "relations": [r.model_dump() for r in relations],
                },
                ensure_ascii=False,
            )
            yield f"data: {complete_data}\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            error_data = json.dumps({
                "type": "error",
                "code": "STREAM_ERROR",
                "message": str(e),
                "recoverable": True
            }, ensure_ascii=False)
            yield f"data: {error_data}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/chat/recommendations")
async def get_recommendations(
    request: RecommendationRequest,
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_or_guest),
):
    """获取智能推荐问题 - 基于对话历史上下文"""
    try:
        conversation_history = []
        extracted_entities = request.entities or []
        extracted_keywords = request.keywords or []
        context_content = request.context or ""

        if request.session_id:
            message_service = MessageService(db)
            messages, total, _ = await message_service.get_session_messages(
                request.session_id, page=1, page_size=10
            )

            for msg in messages[-6:]:
                conversation_history.append({
                    "role": msg.role.value if hasattr(msg.role, "value") else msg.role,
                    "content": msg.content[:200],
                })

                if msg.entities:
                    for entity in msg.entities:
                        name = entity.name if hasattr(entity, "name") else entity
                        if name not in extracted_entities:
                            extracted_entities.append(name)

                if msg.keyword_records:
                    for kw_record in msg.keyword_records:
                        kw = kw_record.keyword if hasattr(kw_record, "keyword") else kw_record
                        if kw not in extracted_keywords:
                            extracted_keywords.append(kw)

            if conversation_history:
                last_user_msg = next(
                    (m for m in reversed(conversation_history) if m["role"] == "user"), None
                )
                if last_user_msg:
                    context_content = context_content or last_user_msg["content"]

        hour = datetime.now().hour
        if 6 <= hour < 12:
            time_of_day = 'morning'
        elif 12 <= hour < 18:
            time_of_day = 'afternoon'
        elif 18 <= hour < 23:
            time_of_day = 'evening'
        else:
            time_of_day = 'night'

        recommendations = question_generator.generate_recommendations(
            entities=extracted_entities,
            keywords=extracted_keywords,
            context=context_content,
            time_of_day=time_of_day,
            limit=request.limit
        )

        return {"questions": recommendations}
    except Exception as e:
        logger.error(f"Failed to generate recommendations: {e}")
        questions = [
            RecommendedQuestion(id="1", question="什么是非物质文化遗产？"),
            RecommendedQuestion(id="2", question="如何成为非遗传承人？"),
            RecommendedQuestion(id="3", question="非遗保护有哪些重要意义？"),
            RecommendedQuestion(id="4", question="传统技艺如何与现代生活结合？"),
            RecommendedQuestion(id="5", question="中国有哪些世界级非遗项目？"),
            RecommendedQuestion(id="6", question="非遗传承面临哪些挑战？"),
        ]
        return {"questions": questions}


@router.post("/chat/message/{message_id}/feedback")
async def submit_feedback(
    message_id: str,
    request: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        message_service = MessageService(db)
        message = await message_service.update_feedback(message_id, request.feedback)
        if not message:
            raise HTTPException(status_code=404, detail="消息不存在")
        return {"success": True, "feedback": request.feedback}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=f"提交反馈失败: {str(e)}")


@router.post("/chat/message/{message_id}/favorite", response_model=FavoriteResponse)
async def toggle_favorite(
    message_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        message_service = MessageService(db)
        is_favorite = await message_service.toggle_favorite(message_id)
        if is_favorite is None:
            raise HTTPException(status_code=404, detail="消息不存在")
        return FavoriteResponse(is_favorite=is_favorite)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling favorite: {e}")
        raise HTTPException(status_code=500, detail=f"操作失败: {str(e)}")


@router.get("/session", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    try:
        session_service = SessionService(db)
        sessions, total = await session_service.get_user_sessions(user_id, page, page_size)
        
        session_data = []
        for s in sessions:
            data = parse_session_tags(s)
            session_data.append(SessionSchema(**data))
        
        return SessionListResponse(
            sessions=session_data,
            total=total,
            page=page,
            page_size=page_size,
        )
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=f"获取会话列表失败: {str(e)}")


@router.post("/session", response_model=SessionSchema)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    try:
        session_service = SessionService(db)
        session = await session_service.create_session(user_id, data)
        # Session.tags 在数据库中是 JSON 字符串，统一转换为 list 后再返回
        parsed_data = parse_session_tags(session)
        return SessionSchema(**parsed_data)
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=f"创建会话失败: {str(e)}")


@router.get("/session/{session_id}", response_model=SessionSchema)
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        session_service = SessionService(db)
        session = await session_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        data = parse_session_tags(session)
        return SessionSchema(**data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail=f"获取会话失败: {str(e)}")


@router.put("/session/{session_id}", response_model=SessionSchema)
async def update_session(
    session_id: str,
    data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        session_service = SessionService(db)
        session = await session_service.update_session(session_id, data)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        
        parsed_data = parse_session_tags(session)
        return SessionSchema(**parsed_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session: {e}")
        raise HTTPException(status_code=500, detail=f"更新会话失败: {str(e)}")


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        session_service = SessionService(db)
        success = await session_service.delete_session(session_id)
        if not success:
            raise HTTPException(status_code=404, detail="会话不存在")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail=f"删除会话失败: {str(e)}")


@router.get("/session/{session_id}/messages", response_model=MessageListResponse)
async def get_session_messages(
    session_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    try:
        session_service = SessionService(db)
        session = await session_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
        if session.user_id != user_id:
            raise HTTPException(status_code=403, detail="无权访问该会话消息")

        message_service = MessageService(db)
        messages, total, has_more = await message_service.get_session_messages(
            session_id, page, page_size
        )
        
        message_schemas = []
        for msg in messages:
            sources = [
                Source(
                    id=s.id,
                    title=s.title,
                    content=s.content,
                    url=s.url,
                    page=s.page,
                    relevance=s.relevance / 100.0,
                )
                for s in msg.sources
            ]
            entities = [
                Entity(
                    id=e.id,
                    name=e.name,
                    type=e.type,
                    description=e.description,
                    relevance=(e.relevance / 100.0) if e.relevance is not None else None,
                )
                for e in msg.entities
            ]
            relations = []
            for r in msg.relations:
                relation_type_raw = r.relation_type or "related_to"
                try:
                    relation_type = RelationType(relation_type_raw)
                except ValueError:
                    relation_type = RelationType.related_to

                relations.append(
                    Relation(
                        id=r.id,
                        source=r.source_entity,
                        target=r.target_entity,
                        type=relation_type,
                        confidence=(r.confidence / 100.0) if r.confidence is not None else 0.8,
                        evidence=r.evidence,
                        bidirectional=bool(r.bidirectional),
                    )
                )

            keywords = []
            if msg.keywords:
                if isinstance(msg.keywords, str):
                    try:
                        parsed = json.loads(msg.keywords)
                        if isinstance(parsed, list):
                            keywords = [k for k in parsed if isinstance(k, str)]
                    except json.JSONDecodeError:
                        keywords = []
                elif isinstance(msg.keywords, list):
                    keywords = [k for k in msg.keywords if isinstance(k, str)]
            message_schemas.append(
                MessageSchema(
                    id=msg.id,
                    session_id=msg.session_id,
                    role=msg.role,
                    content=msg.content,
                    created_at=msg.created_at,
                    sources=sources,
                    entities=entities,
                    relations=relations,
                    keywords=keywords,
                    feedback=msg.feedback,
                    is_favorite=msg.is_favorite,
                )
            )
        
        return MessageListResponse(
            messages=message_schemas,
            total=total,
            has_more=has_more,
        )
    except Exception as e:
        logger.error(f"Error getting session messages: {e}")
        raise HTTPException(status_code=500, detail=f"获取消息失败: {str(e)}")


@router.post("/chat/message/{message_id}/regenerate")
async def regenerate_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_or_guest),
):
    """重新生成指定消息的 AI 回复"""
    session_service = SessionService(db)
    message_service = MessageService(db)

    try:
        # 获取原消息
        original_message = await message_service.get_message(message_id)
        if not original_message:
            raise HTTPException(status_code=404, detail="消息不存在")

        if original_message.role != MessageRole.assistant:
            raise HTTPException(status_code=400, detail="只能重新生成 AI 回复")

        # 获取用户消息（上一条消息）
        messages = await message_service.get_messages_by_session(
            original_message.session_id, page=1, page_size=100
        )
        
        user_message = None
        for i, msg in enumerate(messages):
            if msg.id == message_id and i > 0:
                user_message = messages[i - 1]
                break

        if not user_message:
            raise HTTPException(status_code=404, detail="找不到对应的用户消息")

        # 调用 LLM 重新生成
        ai_response = await llm_service.chat(user_message.content)
        extract_src = _build_entity_keyword_extraction_text(user_message.content, ai_response)
        entities = await llm_service.extract_entities(extract_src)
        keywords = await llm_service.extract_keywords(extract_src)
        entities, keywords, relations = await _finalize_chat_round_graph(
            message_service,
            original_message.session_id,
            user_message.content,
            ai_response,
            entities,
            keywords,
            exclude_message_ids={message_id},
        )
        sources = await retrieve_sources_from_knowledge(db, user_message.content, entities)

        # 更新原消息内容
        updated_message = await message_service.update_message(
            message_id=message_id,
            content=ai_response,
            sources=sources,
            entities=entities,
            keywords=keywords,
            relations=relations,
        )

        return ChatMessageResponse(
            message_id=updated_message.id,
            content=updated_message.content,
            role=updated_message.role,
            sources=sources,
            entities=entities,
            keywords=keywords,
            created_at=updated_message.created_at.isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating message: {e}")
        raise HTTPException(status_code=500, detail=f"重新生成失败: {str(e)}")


@router.post("/chat/message/{message_id}/regenerate/stream")
async def regenerate_message_stream(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_or_guest),
):
    """流式重新生成指定消息的 AI 回复"""
    session_service = SessionService(db)
    message_service = MessageService(db)

    try:
        # 获取原消息
        original_message = await message_service.get_message(message_id)
        if not original_message:
            raise HTTPException(status_code=404, detail="消息不存在")

        if original_message.role != MessageRole.assistant:
            raise HTTPException(status_code=400, detail="只能重新生成 AI 回复")

        # 获取用户消息
        messages = await message_service.get_messages_by_session(
            original_message.session_id, page=1, page_size=100
        )
        
        user_message = None
        for i, msg in enumerate(messages):
            if msg.id == message_id and i > 0:
                user_message = messages[i - 1]
                break

        if not user_message:
            raise HTTPException(status_code=404, detail="找不到对应的用户消息")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error preparing regeneration: {e}")
        raise HTTPException(status_code=500, detail=f"准备重新生成失败: {str(e)}")

    async def generate():
        full_content = ""
        accumulated_length = 0
        
        try:
            async for chunk in llm_service.chat_stream(user_message.content):
                full_content += chunk
                accumulated_length += len(chunk)
                
                data = json.dumps({
                    "type": "content_chunk",
                    "content": chunk,
                    "accumulated_length": accumulated_length
                }, ensure_ascii=False)
                yield f"data: {data}\n\n"

            extract_src = _build_entity_keyword_extraction_text(user_message.content, full_content)
            entities = await llm_service.extract_entities(extract_src)
            keywords = await llm_service.extract_keywords(extract_src)
            entities, keywords, relations = await _finalize_chat_round_graph(
                message_service,
                original_message.session_id,
                user_message.content,
                full_content,
                entities,
                keywords,
                exclude_message_ids={message_id},
            )
            sources = await retrieve_sources_from_knowledge(db, user_message.content, entities)

            if entities:
                yield (
                    "data: "
                    + json.dumps({"type": "entities", "entities": [e.model_dump() for e in entities]}, ensure_ascii=False)
                    + "\n\n"
                )

            if keywords:
                yield "data: " + json.dumps({"type": "keywords", "keywords": keywords}, ensure_ascii=False) + "\n\n"

            if relations:
                yield (
                    "data: "
                    + json.dumps(
                        {"type": "relations", "relations": [r.model_dump() for r in relations]},
                        ensure_ascii=False,
                    )
                    + "\n\n"
                )

            await message_service.update_message(
                message_id=message_id,
                content=full_content,
                sources=sources,
                entities=entities,
                keywords=keywords,
                relations=relations,
            )

            yield (
                "data: "
                + json.dumps(
                    {
                        "type": "complete",
                        "message_id": message_id,
                        "content": full_content,
                        "sources": [s.model_dump() for s in sources],
                        "entities": [e.model_dump() for e in entities],
                        "keywords": keywords,
                        "relations": [r.model_dump() for r in relations],
                    },
                    ensure_ascii=False,
                )
                + "\n\n"
            )

        except Exception as e:
            logger.error(f"Stream regeneration error: {e}")
            yield "data: " + json.dumps({"type": "error", "message": str(e)}, ensure_ascii=False) + "\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
