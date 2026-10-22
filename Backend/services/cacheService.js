class CacheService {
  constructor() {
    this.memoryStore = new Map();
    this.isRedis = false;
  }

  async get(key) {
    if (this.memoryStore.has(key)) {
      const item = this.memoryStore.get(key);
      if (item.expiry && item.expiry < Date.now()) {
        this.memoryStore.delete(key);
        return null;
      }
      return item.value;
    }
    return null;
  }

  async set(key, value, ttlSeconds = 300) {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryStore.set(key, { value, expiry });
    return true;
  }

  async del(key) {
    return this.memoryStore.delete(key);
  }

  async clear() {
    this.memoryStore.clear();
  }
}

export const cache = new CacheService();
