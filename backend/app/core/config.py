from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional
from functools import lru_cache

# 与 CORS_ORIGINS 取并集：IPv4、域名、localhost、任意端口（含默认 80/443 省略端口）。
# 生产环境请在 .env 设置 CORS_STRICT=true 并只保留 CORS_ORIGINS 白名单。
CORS_DEMO_ORIGIN_REGEX = r"^https?://[a-zA-Z0-9.\-]+(:\d+)?$"

# .env 整表替换 CORS_ORIGINS 时易漏公网；加载后强制并入（去重）。
_CORS_ORIGINS_ALWAYS_MERGE: tuple[str, ...] = (
    "http://182.92.76.74:3000",
    "http://182.92.76.74:8000",
)


class Settings(BaseSettings):
    APP_NAME: str = "非遗数字生命互动引擎"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./heritage.db"
    REDIS_URL: Optional[str] = None
    
    NEO4J_URI: Optional[str] = None
    NEO4J_USER: Optional[str] = None
    NEO4J_PASSWORD: Optional[str] = None
    
    MILVUS_HOST: Optional[str] = None
    MILVUS_PORT: int = 19530
    
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    DASHSCOPE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    
    # 浏览器跨域时 Origin 必须命中下列之一；否则 OPTIONS 预检会 400（见 README / .env.example）
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
        "http://182.92.76.74:3000",
        "http://182.92.76.74:8000",
    ]
    # 可选：与 CORS_ORIGINS 取并集；非空则覆盖内置 DEMO 正则（见 main.py）
    CORS_ORIGIN_REGEX: Optional[str] = None
    # True：不启用内置 DEMO 正则，仅白名单 + 可选 CORS_ORIGIN_REGEX（上线建议 True）
    CORS_STRICT: bool = False
    # False：不再把 _CORS_ORIGINS_ALWAYS_MERGE 并入 CORS_ORIGINS（换公网 IP 部署且不想带旧 IP 时设 false）
    CORS_ORIGINS_MERGE_DEFAULTS: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

    @model_validator(mode="after")
    def _merge_fixed_deploy_cors_origins(self):
        if not self.CORS_ORIGINS_MERGE_DEFAULTS:
            return self
        merged = list(dict.fromkeys([*self.CORS_ORIGINS, *_CORS_ORIGINS_ALWAYS_MERGE]))
        object.__setattr__(self, "CORS_ORIGINS", merged)
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
