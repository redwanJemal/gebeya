# 🛒 ገበያ (Gebeya) - Ethiopian Marketplace

A Telegram Mini App marketplace for buying and selling in Ethiopia.

## Features

- 🔐 Telegram authentication
- 📱 Phone verification for sellers
- 📤 Create listings with photos
- 🔍 Search & filter by category, price, location
- ❤️ Favorites
- 💬 In-app chat (coming soon)
- 🇪🇹 Amharic-first UI

## Tech Stack

**Backend:**
- FastAPI + Python 3.12
- PostgreSQL + SQLAlchemy
- Redis for caching
- MinIO for image storage
- Alembic migrations

**Frontend:**
- React 18 + Vite
- TypeScript
- Tailwind CSS
- Telegram Mini Apps SDK

## Development

```bash
# Start all services
docker compose up -d

# Run migrations
docker exec ministack-backend alembic upgrade head
```

## Deployment

```bash
# Production build
docker compose -f docker-compose.prod.yml up -d --build
```

## Environment Variables

See `.env.example` for required configuration.

## License

MIT
