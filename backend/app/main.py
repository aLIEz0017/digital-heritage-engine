from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import os
import uvicorn

from app.core.config import settings, CORS_DEMO_ORIGIN_REGEX
from app.core.database import init_db
from app.api.v1 import chat, knowledge, favorite, user, graph
from app.models import chat as chat_models
from app.models import knowledge as knowledge_models
from app.models import graph as graph_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="智能问答与知识图谱检索后端服务",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)
@app.on_event("startup")
async def print_routes():
    _cr = (settings.CORS_ORIGIN_REGEX or "").strip()
    _cors_mode = (
        "regex=.env CORS_ORIGIN_REGEX"
        if _cr
        else ("strict 仅白名单" if settings.CORS_STRICT else "白名单 + 内置 DEMO 正则(http(s)+主机+可选端口)")
    )
    print(f"CORS: {_cors_mode}, allow_origins 条目数={len(settings.CORS_ORIGINS)}")
    print("\n" + "="*50)
    print("🚀 当前后端真实注册的接口清单：")
    for route in app.routes:
        # 只打印我们关心的业务接口，过滤掉一些内置的
        if hasattr(route, "methods") and "api" in route.path:
            methods = ",".join(route.methods)
            print(f"[{methods}]  {route.path}")
    print("="*50 + "\n")
# 2. 确保存放头像的文件夹存在
os.makedirs("static/avatars", exist_ok=True)

# 3. 确保上传目录存在
os.makedirs("uploads", exist_ok=True)

# 4. 挂载静态资源目录
app.mount("/static", StaticFiles(directory="static"), name="static")

# 5. 挂载上传文件目录，使上传的文件可通过 URL 访问
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(chat.router, tags=["chat"])
app.include_router(knowledge.router, tags=["knowledge"])
app.include_router(favorite.router, tags=["favorites"])
app.include_router(user.router, tags=["user"])
app.include_router(graph.router, tags=["graph"])


@app.get("/")
async def root():
    return {
        "message": f"{settings.APP_NAME} API 服务运行中",
        "version": settings.APP_VERSION,
    }

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy"}


# CORS 必须最后注册，才能作为最外层 ASGI 先处理 OPTIONS 预检（见 Starlette 文档：后添加的中间件先执行）
_cors_kwargs = {
    "allow_origins": settings.CORS_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
    # Chrome 等对「公网页访问内网/本地」会带 Access-Control-Request-Private-Network；不设 true 时预检会 400 且无 ACAO
    "allow_private_network": True,
}
_env_regex = (settings.CORS_ORIGIN_REGEX or "").strip()
if _env_regex:
    _cors_kwargs["allow_origin_regex"] = _env_regex
elif not settings.CORS_STRICT:
    _cors_kwargs["allow_origin_regex"] = CORS_DEMO_ORIGIN_REGEX
app.add_middleware(CORSMiddleware, **_cors_kwargs)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
