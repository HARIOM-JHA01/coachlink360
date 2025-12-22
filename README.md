# CoachLink360 - Meeting Survey System

A webhook-based system that receives meeting data, sends customer feedback surveys via email, and stores responses.

## Setup

1. Copy `.env.example` to `.env` and fill in your Resend API key:

   ```bash
   cp .env.example .env
   ```

2. Get your Resend API key from [resend.com/api-keys](https://resend.com/api-keys)

3. Start the application with Docker:

   ```bash
   docker-compose up -d
   ```

4. Run database migrations:
   ```bash
   docker-compose exec app npm run db:migrate
   ```

## API Endpoints

### POST /api/webhook

Receive meeting data and trigger survey emails.

**Example payload:**

```json
{
  "session_id": "01KD37V098VCA8EV5MK2552BK5",
  "trigger": "meeting_end",
  "title": "Meeting Title",
  "participants": [
    {
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

### GET /api/survey/:token

Display survey form for a participant.

### POST /api/survey/:token

Submit survey responses.

## Development

```bash
# View logs
docker-compose logs -f app

# Rebuild after changes
docker-compose up -d --build

# Stop services
docker-compose down
```

## Database

PostgreSQL is included in docker-compose. Tables:

- `meetings` - Stores meeting data as JSONB
- `survey_invites` - Tracks survey emails sent
- `survey_responses` - Stores survey answers
