"""OpenSearch client"""
from opensearchpy import AsyncOpenSearch
from ..config import settings

_client: AsyncOpenSearch | None = None

async def init_opensearch():
    """Initialize OpenSearch client"""
    global _client
    _client = AsyncOpenSearch(
        hosts=[settings.opensearch_url],
        http_auth=(settings.opensearch_username, settings.opensearch_password),
        use_ssl=False,
        verify_certs=False,
    )

async def close_opensearch():
    """Close OpenSearch client"""
    global _client
    if _client:
        await _client.close()

def get_opensearch_client() -> AsyncOpenSearch:
    """Get OpenSearch client"""
    if _client is None:
        raise RuntimeError("OpenSearch not initialized")
    return _client
