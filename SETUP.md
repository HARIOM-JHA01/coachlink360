# CoachLink360 - Setup & Configuration Guide

## 🚀 Quick Start

Your webhook-based meeting survey system is now running on **http://localhost:3001**

### Important: Configure Resend API Key

1. Get your API key from [resend.com/api-keys](https://resend.com/api-keys)
2. Update the `.env` file:
   ```bash
   RESEND_API_KEY=re_your_actual_api_key_here
   ```
3. Restart the containers:
   ```bash
   docker-compose restart app
   ```

## 📋 What's Been Implemented

### ✅ Core Features

1. **Flexible Webhook Endpoint** (`POST /api/webhook`)

   - Accepts any JSON structure (schema-less design)
   - Stores complete meeting data as JSONB
   - Extracts participants automatically
   - Handles missing email addresses gracefully

2. **Automated Email Survey System**

   - Beautiful HTML email template
   - Personalized for each participant
   - Unique survey links with secure tokens
   - Prevents duplicate submissions

3. **Interactive Survey Form** (`GET /api/survey/:token`)

   - 5-point rating scale for 5 questions:
     - Punctuality
     - Listening & Understanding
     - Knowledge & Expertise
     - Clarity of Answers
     - Overall Value
   - 2 open-ended questions
   - Mobile-responsive design

4. **Response Storage** (`POST /api/survey/:token`)

   - Structured columns for ratings
   - JSONB column for flexible data
   - Timestamp tracking
   - Completion status

5. **Database Schema** (PostgreSQL)
   - `meetings` - Stores webhook payloads
   - `survey_invites` - Tracks emails sent
   - `survey_responses` - Stores survey answers

## 🧪 Testing

### Test the Webhook

Run the provided test script:

```bash
./test-webhook.sh
```

Or manually test with curl:

```bash
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-123",
    "title": "Test Meeting",
    "participants": [
      {"name": "Test User", "email": "test@example.com"}
    ]
  }'
```

### View Database Contents

```bash
# View meetings
docker-compose exec db psql -U postgres -d coachlink360 -c "SELECT id, session_id, created_at FROM meetings;"

# View survey invites
docker-compose exec db psql -U postgres -d coachlink360 -c "SELECT * FROM survey_invites;"

# View survey responses
docker-compose exec db psql -U postgres -d coachlink360 -c "SELECT * FROM survey_responses;"
```

## 🔧 Common Commands

```bash
# View logs
docker-compose logs -f app

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Access database shell
docker-compose exec db psql -U postgres -d coachlink360
```

## 📧 Email Configuration

### Resend Free Tier Limits

- 3,000 emails/month
- 100 emails/day
- 2 requests/second

### Important Notes

1. **Testing Emails**: Use real email addresses or Resend's test emails
2. **From Email**: Default is `onboarding@resend.dev`
   - To use custom domain: Add and verify domain in Resend dashboard
   - Update `FROM_EMAIL` in `.env`
3. **Rate Limiting**: System handles 2 req/sec limit automatically

## 🔐 Environment Variables

All configurable in `.env`:

```bash
RESEND_API_KEY=re_xxx          # Get from resend.com
FROM_EMAIL=onboarding@resend.dev
FROM_NAME=CoachLink360
DATABASE_URL=postgresql://...
PORT=3000                      # Internal container port
BASE_URL=http://localhost:3001 # External access URL
```

## 📊 API Endpoints

### POST /api/webhook

Receive meeting data and trigger surveys

**Request Body**: Any JSON structure

```json
{
  "session_id": "unique-id",
  "title": "Meeting Title",
  "participants": [{ "name": "Name", "email": "email@example.com" }]
}
```

**Response**:

```json
{
  "success": true,
  "meeting_id": 1,
  "emails_sent": 2,
  "emails_failed": 0,
  "details": [...]
}
```

### GET /api/webhook

Test endpoint - returns usage information

### GET /api/survey/:token

Display survey form for participant

### POST /api/survey/:token

Submit survey response

**Request Body**:

```json
{
  "punctuality": 5,
  "listening_understanding": 5,
  "knowledge_expertise": 4,
  "clarity_answers": 5,
  "overall_value": 5,
  "most_valuable": "Clear communication",
  "improvements": "More time for Q&A"
}
```

## 🎯 For Other Developers

Share this webhook URL with other developers:

```
POST http://your-server:3001/api/webhook
```

They can send any JSON structure. The system will:

1. Store the complete payload
2. Extract participants with email addresses
3. Send survey emails automatically
4. Generate unique survey links

## 🚀 Production Deployment

1. **Update Environment Variables**:

   - Set `NODE_ENV=production`
   - Update `BASE_URL` to your production domain
   - Use production Resend API key

2. **Database Backup**:

   ```bash
   docker-compose exec db pg_dump -U postgres coachlink360 > backup.sql
   ```

3. **SSL/HTTPS**: Use nginx or Caddy as reverse proxy

4. **Monitoring**: Add logging service (Sentry, LogRocket)

## 📝 Next Steps

- [ ] Configure Resend API key
- [ ] Test with sample webhook data
- [ ] Customize email template if needed
- [ ] Add custom domain to Resend
- [ ] Set up production environment
- [ ] Configure monitoring/alerts

## 🐛 Troubleshooting

**Emails not sending?**

- Check RESEND_API_KEY is valid
- Verify FROM_EMAIL is allowed (use onboarding@resend.dev for testing)
- Check logs: `docker-compose logs app`

**Port already in use?**

- Change port in docker-compose.yml
- Update BASE_URL in .env

**Database connection issues?**

- Ensure db container is running: `docker-compose ps`
- Check DATABASE_URL is correct

## 📚 Technology Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL 16 with JSONB
- **Email**: Resend API
- **Containerization**: Docker + Docker Compose
- **Dependencies**: pg, resend, express, dotenv, uuid

---

**Ready to Go!** 🎉

Your survey system is running and ready to receive webhooks. Just add your Resend API key to start sending emails.
