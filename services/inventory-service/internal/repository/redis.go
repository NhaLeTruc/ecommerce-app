package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ecommerce/inventory-service/internal/domain"
	"github.com/redis/go-redis/v9"
)

type redisRepository struct {
	client *redis.Client
}

// NewRedisRepository creates a new Redis cache repository
func NewRedisRepository(client *redis.Client) CacheRepository {
	return &redisRepository{client: client}
}

func (r *redisRepository) cacheKey(key string) string {
	return fmt.Sprintf("inventory:%s", key)
}

// Get retrieves an item from cache
func (r *redisRepository) Get(ctx context.Context, key string) (*domain.InventoryItem, error) {
	data, err := r.client.Get(ctx, r.cacheKey(key)).Bytes()
	if err == redis.Nil {
		return nil, nil // Cache miss
	}
	if err != nil {
		return nil, err
	}

	var item domain.InventoryItem
	if err := json.Unmarshal(data, &item); err != nil {
		return nil, err
	}

	return &item, nil
}

// Set stores an item in cache
func (r *redisRepository) Set(ctx context.Context, key string, item *domain.InventoryItem, ttl time.Duration) error {
	data, err := json.Marshal(item)
	if err != nil {
		return err
	}

	return r.client.Set(ctx, r.cacheKey(key), data, ttl).Err()
}

// Delete removes an item from cache
func (r *redisRepository) Delete(ctx context.Context, key string) error {
	return r.client.Del(ctx, r.cacheKey(key)).Err()
}

// FlushAll clears all cached inventory items
func (r *redisRepository) FlushAll(ctx context.Context) error {
	pattern := r.cacheKey("*")
	iter := r.client.Scan(ctx, 0, pattern, 0).Iterator()

	for iter.Next(ctx) {
		if err := r.client.Del(ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}

	return iter.Err()
}
