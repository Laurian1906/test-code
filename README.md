# Base44 App

This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

**Note**: Chat functionality has been migrated to use n8n instead of Base44. See [N8N_SETUP.md](./N8N_SETUP.md) for configuration.

## Running the app

```bash
npm install
npm run dev
```

## Configuration

### n8n Integration (Required for Chat)

1. Copy `env.example` to `.env`:

   ```bash
   cp env.example .env
   ```

2. Configure n8n webhook URL in `.env`:

   ```
   VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/chat
   ```

3. Set up n8n workflow (see [N8N_SETUP.md](./N8N_SETUP.md) for detailed instructions)

### Postgres Database Setup (Conversații)

1. Make sure Docker is installed and running.
2. Start the Postgres service:

   ```bash
   docker compose up -d postgres
   ```

   This launches a Postgres 16 container, mounts the persistent volume at `./data/postgres`, and automatically applies `db/init.sql` to create the `conversations` table plus indexes.

3. (Optional) Connect using the credentials from `.env` (defaults: user `nenos`, password `wJS9tXh9pQ9J4zAN`, database `oms_db`).
4. Configure n8n (or any data ingestion service) to use the `DATABASE_URL` from `.env` when inserting conversation rows.

## Building the app

```bash
npm run build
```

## Features

- **Chat with AI**: Integrated with n8n for LLM processing
- **Feedback Collection**: Collect and manage user feedback
- **Dashboard**: Analytics and conversation management
- **User Authentication**: Base44 auth (optional for local development)

## Migration Status

- ✅ Chat/LLM: Migrated to n8n
- ⏳ Tickets/Entities: Still using Base44 (to be migrated to local backend)
- ⏳ File Upload: Still using Base44 (to be migrated to local storage)
- ⏳ User Auth: Base44 (to be migrated to local auth)

For more information and support, please contact Base44 support at app@base44.com.
# test-code
