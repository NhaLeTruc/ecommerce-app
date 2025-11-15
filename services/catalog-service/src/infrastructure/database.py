"""MongoDB database connection"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from ..config import settings

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None

async def init_database():
    """Initialize MongoDB connection"""
    global _client, _database
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _database = _client[settings.mongodb_database]

async def close_database():
    """Close MongoDB connection"""
    global _client
    if _client:
        _client.close()

def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    if _database is None:
        raise RuntimeError("Database not initialized")
    return _database
