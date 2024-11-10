import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize Redis client
const redisClient: RedisClientType = createClient({
  url: redisUrl,
});

// Event listeners for Redis client
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Could not establish a connection with Redis. ' + error);
  }
})();

export default redisClient;
