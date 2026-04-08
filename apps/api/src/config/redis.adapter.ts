import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// redis.adapter.ts
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: any;

  async connectToRedis() {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.on('connect', () => {
      console.log('🟢 Redis PUB connected');
    });

    subClient.on('connect', () => {
      console.log('🟢 Redis SUB connected');
    });

    pubClient.on('error', (err) => {
      console.error('🔴 Redis PUB error', err);
    });

    subClient.on('error', (err) => {
      console.error('🔴 Redis SUB error', err);
    });

    await pubClient.connect();
    await subClient.connect();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);
    console.log('⚡ Using Redis Adapter');
    server.adapter(this.adapterConstructor);
    return server;
  }
}
