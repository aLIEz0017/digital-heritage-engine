"""
添加 session 表的 is_archived 和 tags 字段
"""
import sqlite3
from pathlib import Path

# 数据库路径
DB_PATH = Path(__file__).parent / "app" / "heritage.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 添加 is_archived 字段
        cursor.execute("""
            ALTER TABLE sessions ADD COLUMN is_archived BOOLEAN DEFAULT FALSE
        """)
        print("✅ 添加 is_archived 字段成功")
        
        # 添加 tags 字段
        cursor.execute("""
            ALTER TABLE sessions ADD COLUMN tags TEXT DEFAULT '[]'
        """)
        print("✅ 添加 tags 字段成功")
        
        conn.commit()
        print("✅ 数据库迁移完成")
        
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("⚠️  字段已存在，跳过迁移")
        else:
            print(f"❌ 迁移失败：{e}")
            conn.rollback()
    except Exception as e:
        print(f"❌ 迁移失败：{e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
