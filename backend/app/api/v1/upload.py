from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import uuid
import os
import json

from app.core.database import get_db
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["upload"])


ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
ALLOWED_DOCUMENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class UploadResponse(BaseModel):
    id: str
    filename: str
    url: str
    type: str
    size: int
    created_at: str


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    # 验证文件大小
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过限制 (10MB)")
    
    # 验证文件类型
    file_type = file.content_type or ""
    allowed_types = ALLOWED_IMAGE_TYPES + ALLOWED_DOCUMENT_TYPES
    
    if file_type not in allowed_types:
        raise HTTPException(status_code=400, detail="不支持的文件类型")
    
    # 生成唯一文件名
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # 创建上传目录
    upload_dir = "uploads"
    if file_type in ALLOWED_IMAGE_TYPES:
        upload_dir = os.path.join(upload_dir, "images")
    else:
        upload_dir = os.path.join(upload_dir, "documents")
    
    os.makedirs(upload_dir, exist_ok=True)
    
    # 保存文件
    file_path = os.path.join(upload_dir, unique_filename)
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # 生成访问 URL
    file_url = f"/uploads/{unique_filename}"
    
    return UploadResponse(
        id=str(uuid.uuid4()),
        filename=file.filename or "unknown",
        url=file_url,
        type=file_type,
        size=len(file_content),
        created_at=datetime.utcnow().isoformat(),
    )


@router.post("/upload/multiple", response_model=List[UploadResponse])
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    user_id: str = Depends(get_current_user),
):
    results = []
    for file in files:
        try:
            result = await upload_file(file, user_id)
            results.append(result)
        except HTTPException as e:
            # 跳过失败的文件，继续上传其他文件
            continue
    return results


@router.delete("/upload/{file_id}")
async def delete_file(
    file_id: str,
    user_id: str = Depends(get_current_user),
):
    # 实际应用中需要根据 file_id 查找文件记录并删除
    return {"success": True}
