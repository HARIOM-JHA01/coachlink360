#!/bin/bash

# Test script for the webhook system
# Make sure to update .env with your actual RESEND_API_KEY before testing email functionality

echo "🧪 Testing CoachLink360 Webhook System"
echo "========================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s http://localhost:3001/health | jq .
echo ""
echo ""

# Test 2: Webhook GET endpoint
echo "2️⃣  Testing Webhook GET endpoint..."
curl -s http://localhost:3001/api/webhook | jq .
echo ""
echo ""

# Test 3: Webhook POST with sample meeting data
echo "3️⃣  Testing Webhook POST with meeting data..."
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "01KD37V098VCA8EV5MK2552BK5",
    "trigger": "meeting_end",
    "title": "Q4 Strategy Meeting",
    "start_time": "2025-12-22T14:06:28.840814Z",
    "end_time": "2025-12-22T14:36:28.840814Z",
    "participants": [
      {
        "name": "Hariom Jha",
        "first_name": "Hariom",
        "last_name": "Jha",
        "email": "jhahariom040@gmail.com"
      },
      {
        "name": "Jane Smith",
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "hariom.jha5499@gmail.com"
      }
    ],
    "owner": {
      "name": "Hariom Jha again",
      "first_name": "Hariom",
      "last_name": "Jha",
      "email": "jhahariom040@gmail.com"
    },
    "summary": "Discussed Q4 strategy and key initiatives...",
    "action_items": [
      {"text": "Finalize budget proposal"},
      {"text": "Schedule follow-up meeting"}
    ]
  }' | jq .

echo ""
echo ""
echo "✅ Tests completed!"
echo ""
echo "📧 Note: If you have configured a valid RESEND_API_KEY in .env,"
echo "   survey emails should have been sent to the participants."
echo ""
echo "📊 To view database contents:"
echo "   docker-compose exec db psql -U postgres -d coachlink360 -c 'SELECT * FROM meetings;'"
echo "   docker-compose exec db psql -U postgres -d coachlink360 -c 'SELECT * FROM survey_invites;'"
