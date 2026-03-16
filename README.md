# ገበያ (Gebeya) - Ethiopian Marketplace

A Telegram Mini App marketplace for buying and selling in Ethiopia.

## Features

- Telegram authentication
- Phone verification for sellers
- Create listings with photos
- Search & filter by category, price, location
- Favorites
- In-app chat
- Amharic-first UI

## Tech Stack

**Backend:** FastAPI, Python 3.12, PostgreSQL 16, SQLAlchemy (async), Redis, Alembic

**Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS, Telegram Mini Apps SDK

## Telegram Bot Setup

The app runs as a [Telegram Mini App](https://core.telegram.org/bots/webapps). Follow these steps to set it up:

### 1. Create a Bot

1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts to choose a name and username
3. Copy the **bot token** — you'll need it for `BOT_TOKEN`
4. Note the **bot username** (without `@`) — this is your `BOT_USERNAME`

### 2. Configure the Mini App

1. In BotFather, send `/mybots` and select your bot
2. Go to **Bot Settings** > **Menu Button** > **Configure menu button**
3. Enter your production URL (e.g., `https://yourdomain.com`)
4. Send `/setmenubutton` to set the text (e.g., "Open Gebeya")

Alternatively, set the Web App URL:

1. In BotFather, send `/mybots` > select your bot
2. Go to **Bot Settings** > **Web App** > **Configure Web App URL**
3. Enter your production frontend URL

### 3. Enable Inline Mode (Optional)

If you want users to share listings via inline queries:

1. In BotFather, send `/setinline`
2. Select your bot and set a placeholder (e.g., "Search listings...")

### 4. Set Bot Commands (Optional)

Send `/setcommands` to BotFather and add:

```
start - Open the marketplace
help - Get help
```

### 5. Deep Linking

The app supports Telegram deep links for sharing listings directly:

```
https://t.me/<BOT_USERNAME>?startapp=l_<listingId>
```

When a user opens this link, Telegram launches the Mini App and passes the listing ID as a start parameter.

### 6. Admin Setup

Set `ADMIN_TELEGRAM_IDS` in your `.env` with comma-separated Telegram user IDs for admin access:

```env
ADMIN_TELEGRAM_IDS=123456789,987654321
```

To find your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# App
APP_NAME=MiniStack
APP_URL=https://your-domain.com
DEBUG=false

# Telegram Bot
BOT_TOKEN=<from BotFather>
BOT_USERNAME=<bot username without @>
ADMIN_TELEGRAM_IDS=<comma-separated admin Telegram IDs>

# Database
DATABASE_URL=postgresql+asyncpg://ministack:secret@db:5432/ministack
POSTGRES_USER=ministack
POSTGRES_PASSWORD=secret
POSTGRES_DB=ministack

# Redis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=<random string, 32+ chars>
JWT_SECRET=<random string, 32+ chars>

# CORS
CORS_ORIGINS=https://your-domain.com
```

## Development

```bash
# Start backend + database + redis
docker compose up -d

# Run database migrations
docker exec ministack-backend alembic upgrade head

# Start frontend locally (proxies API to backend:8010)
cd frontend && npm install && npm run dev
```

## Deployment

### Manual

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### GitLab CI/CD

The project includes a `.gitlab-ci.yml` pipeline with two stages:

**Build** (automatic on push to `main`):
- Builds backend and frontend Docker images in parallel
- Pushes to GitLab Container Registry tagged with commit SHA and `latest`

**Deploy** (manual trigger):
- SSHs into the production server
- Pulls latest images from registry
- Restarts services via `docker compose`

#### Required CI/CD Variables

Set these in **GitLab > Settings > CI/CD > Variables**:

| Variable | Description |
|---|---|
| `SSH_PRIVATE_KEY` | SSH private key for the production server (type: File, masked) |
| `SSH_KNOWN_HOSTS` | Output of `ssh-keyscan <server-ip>` |
| `SSH_USER` | SSH username on production server |
| `SSH_HOST` | Production server IP or hostname |
| `PROJECT_DIR` | Path to project on server (e.g., `/opt/gebeya`) |
| `VITE_API_URL` | Production API URL (e.g., `https://yourdomain.com/api/v1`) |

GitLab provides `CI_REGISTRY`, `CI_REGISTRY_USER`, `CI_REGISTRY_PASSWORD`, and `CI_REGISTRY_IMAGE` automatically.

## Database Migrations

```bash
# Create a new migration
docker exec ministack-backend alembic revision --autogenerate -m "description"

# Apply migrations
docker exec ministack-backend alembic upgrade head

# Rollback one migration
docker exec ministack-backend alembic downgrade -1
```

## License

MIT
