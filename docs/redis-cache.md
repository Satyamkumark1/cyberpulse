# Optional Redis cache

CyberPulse has a free, local-first Redis integration for the two workloads that benefit from sharing state between web processes:

- geographic Photon lookup results, cached for one hour;
- API rate-limit buckets, using Redis `INCR` with a short expiry.

Start it with `docker compose up -d redis`, then set `REDIS_URL=redis://localhost:6379` in `apps/web/.env.local`. Redis is optional. If the variable is missing or Redis is unavailable, the app automatically uses the existing in-memory geographic cache and rate limiter.

Prediction values, alerts, complaints, and other sensitive application data are not cached. Redis keys contain hashes rather than raw search URLs or user input.
