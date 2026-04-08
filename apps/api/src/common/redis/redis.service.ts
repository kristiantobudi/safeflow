import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Set a key with a value and optional TTL (in seconds)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  /**
   * Get all fields and values from a hash
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  /**
   * Set expiry for a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Clear all keys matching a pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Clear the entire database (use with caution)
   */
  async flushall(): Promise<void> {
    await this.redis.flushall();
  }
}
