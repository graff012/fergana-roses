import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger: Logger;
  public readonly redis: Redis;
  private readonly duration: number = 60;
  private readonly sessionDuration: number = 300;

  constructor() {
    this.logger = new Logger(RedisService.name);

    this.redis = new Redis({
      port: +(process.env.REDIS_PORT as string),
      host: process.env.REDIS_HOST as string,
      password: process.env.REDIS_PASSWORD as string,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected.');
    });

    this.redis.on('error', (err) => {
      this.logger.error(err);
      this.redis.quit();
      process.exit(1);
    });
  }

  async setOtp(phone_number: string, ot: string) {
    const key = `user:${phone_number}`;

    const result = await this.redis.setex(key, this.duration, ot);

    return result;
  }

  async getOtp(key: string) {
    const otp = await this.redis.get(key);

    return otp;
  }

  async getTtlKey(key: string) {
    const ttl = await this.redis.ttl(key);

    return ttl;
  }

  async delKey(key: string) {
    await this.redis.del(key);
  }

  async sessionTokenUser(phone_number: string, token: string) {
    const key = `session_token:${phone_number}`;

    const result = await this.redis.setex(key, this.sessionDuration, token);

    return result;
  }

  async getKey(key: string) {
    const result = await this.redis.get(key);

    return result;
  }
}
