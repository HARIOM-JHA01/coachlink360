const express = require("express");
const router = express.Router();
const db = require("../db");

// GET survey form
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Get survey invite details
    const inviteResult = await db.query(
      `SELECT si.*, m.meeting_data 
       FROM survey_invites si
       JOIN meetings m ON si.meeting_id = m.id
       WHERE si.token = $1`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res
        .status(404)
        .send(
          "<h1>Survey not found</h1><p>This survey link is invalid or has expired.</p>"
        );
    }

    const invite = inviteResult.rows[0];

    // Check if already completed
    if (invite.completed_at) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Survey Already Completed</title>
          <style>${getStyles()}</style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Survey Already Completed</h1>
            <p>Thank you! You've already submitted your feedback for this meeting.</p>
            <p class="date">Submitted on: ${new Date(
              invite.completed_at
            ).toLocaleString()}</p>
          </div>
        </body>
        </html>
      `);
    }

    const meetingData = invite.meeting_data;
    const meetingTitle = meetingData.title || "Recent Meeting";

    // Render survey form
    res.send(generateSurveyForm(token, invite.participant_name, meetingTitle));
  } catch (error) {
    console.error("Error loading survey:", error);
    res
      .status(500)
      .send(
        "<h1>Error</h1><p>Failed to load survey. Please try again later.</p>"
      );
  }
});

// POST survey response
router.post("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const {
      punctuality,
      listening_understanding,
      knowledge_expertise,
      clarity_answers,
      overall_value,
      most_valuable,
      improvements,
    } = req.body;

    // Validate required fields
    if (
      !punctuality ||
      !listening_understanding ||
      !knowledge_expertise ||
      !clarity_answers ||
      !overall_value
    ) {
      return res.status(400).json({
        success: false,
        error: "All rating questions are required",
      });
    }

    // Validate rating ranges
    const ratings = [
      punctuality,
      listening_understanding,
      knowledge_expertise,
      clarity_answers,
      overall_value,
    ];
    if (ratings.some((r) => r < 1 || r > 5)) {
      return res.status(400).json({
        success: false,
        error: "All ratings must be between 1 and 5",
      });
    }

    // Get survey invite
    const inviteResult = await db.query(
      `SELECT id, completed_at FROM survey_invites WHERE token = $1`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      });
    }

    const invite = inviteResult.rows[0];

    if (invite.completed_at) {
      return res.status(400).json({
        success: false,
        error: "Survey already completed",
      });
    }

    // Store response
    await db.query(
      `INSERT INTO survey_responses 
       (survey_invite_id, punctuality, listening_understanding, knowledge_expertise, 
        clarity_answers, overall_value, most_valuable, improvements, response_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        invite.id,
        parseInt(punctuality),
        parseInt(listening_understanding),
        parseInt(knowledge_expertise),
        parseInt(clarity_answers),
        parseInt(overall_value),
        most_valuable || null,
        improvements || null,
        JSON.stringify(req.body),
      ]
    );

    // Mark invite as completed
    await db.query(
      `UPDATE survey_invites SET completed_at = NOW() WHERE id = $1`,
      [invite.id]
    );

    console.log(`Survey completed for token: ${token}`);

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You!</title>
        <style>${getStyles()}</style>
      </head>
      <body>
        <div class="container">
          <h1 style="color: #16a34a;">✓ Thank You!</h1>
          <p style="font-size: 18px; margin: 20px 0;">Your feedback has been submitted successfully.</p>
          <p>We appreciate you taking the time to help us improve our service.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error submitting survey:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit survey",
    });
  }
});

function generateSurveyForm(token, participantName, meetingTitle) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Meeting Feedback Survey</title>
  <style>${getStyles()}</style>
</head>
<body>
  <div class="container">
    <h1>🧩 Customer Meeting Feedback Survey</h1>
    
    <p class="intro">
      Hi ${participantName},<br><br>
      Thank you for taking a moment to share your feedback about your recent meeting with our team.
      Your input helps us improve and make every interaction more valuable.
    </p>

    <div class="meeting-info">
      <strong>Meeting:</strong> ${meetingTitle}
    </div>

    <p class="instructions">
      Please rate each statement from <strong>1 to 5</strong>, where:<br>
      <strong>1</strong> = Strongly disagree and <strong>5</strong> = Strongly agree
    </p>

    <form id="surveyForm" method="POST" action="/api/survey/${token}">
      
      <div class="question-block">
        <h3>Punctuality</h3>
        <p class="question-text">The salesperson joined the meeting on time and respected the agreed schedule.</p>
        <div class="rating-group">
          ${generateRatingButtons("punctuality")}
        </div>
      </div>

      <div class="question-block">
        <h3>Listening & Understanding</h3>
        <p class="question-text">I felt listened to and that my needs or concerns were clearly understood.</p>
        <div class="rating-group">
          ${generateRatingButtons("listening_understanding")}
        </div>
      </div>

      <div class="question-block">
        <h3>Knowledge & Expertise</h3>
        <p class="question-text">The salesperson demonstrated strong knowledge of the product, service, and our business context.</p>
        <div class="rating-group">
          ${generateRatingButtons("knowledge_expertise")}
        </div>
      </div>

      <div class="question-block">
        <h3>Clarity of Answers</h3>
        <p class="question-text">My questions were answered clearly and completely during the meeting.</p>
        <div class="rating-group">
          ${generateRatingButtons("clarity_answers")}
        </div>
      </div>

      <div class="question-block">
        <h3>Overall Value of the Meeting</h3>
        <p class="question-text">The meeting was productive and provided value to me and my organization.</p>
        <div class="rating-group">
          ${generateRatingButtons("overall_value")}
        </div>
      </div>

      <h2 style="margin-top: 40px;">💬 Open Questions</h2>

      <div class="question-block">
        <label for="most_valuable">What did you find most valuable about the meeting?</label>
        <textarea 
          id="most_valuable" 
          name="most_valuable" 
          rows="4" 
          placeholder="Share your thoughts..."
        ></textarea>
      </div>

      <div class="question-block">
        <label for="improvements">What could we improve for future meetings?</label>
        <textarea 
          id="improvements" 
          name="improvements" 
          rows="4" 
          placeholder="Your suggestions..."
        ></textarea>
      </div>

      <button type="submit" class="submit-button">Submit Feedback</button>
    </form>
  </div>

  <script>
    const form = document.getElementById('surveyForm');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validate all rating questions are answered
      const requiredFields = ['punctuality', 'listening_understanding', 'knowledge_expertise', 'clarity_answers', 'overall_value'];
      const missingFields = requiredFields.filter(field => !form.elements[field].value);
      
      if (missingFields.length > 0) {
        alert('Please answer all rating questions (1-5) before submitting.');
        return;
      }
      
      // Submit form
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch('/api/survey/${token}', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          const html = await response.text();
          document.body.innerHTML = html;
        } else {
          const error = await response.json();
          alert('Error: ' + error.error);
        }
      } catch (error) {
        alert('Failed to submit survey. Please try again.');
      }
    });
  </script>
</body>
</html>
  `;
}

function generateRatingButtons(name) {
  return [1, 2, 3, 4, 5]
    .map(
      (value) => `
    <label class="rating-button">
      <input type="radio" name="${name}" value="${value}" required>
      <span class="rating-label">${value}</span>
    </label>
  `
    )
    .join("");
}

function getStyles() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2563eb;
      font-size: 28px;
      margin-bottom: 20px;
    }
    h2 {
      color: #1e40af;
      font-size: 22px;
      margin-top: 30px;
      margin-bottom: 20px;
    }
    h3 {
      color: #1e293b;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .intro {
      color: #666;
      margin-bottom: 25px;
      font-size: 15px;
    }
    .meeting-info {
      background-color: #f0f9ff;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #2563eb;
    }
    .instructions {
      background-color: #fef3c7;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #f59e0b;
      font-size: 14px;
    }
    .question-block {
      margin: 30px 0;
      padding: 20px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .question-text {
      color: #4b5563;
      margin-bottom: 15px;
      font-size: 14px;
    }
    .rating-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .rating-button {
      position: relative;
      cursor: pointer;
    }
    .rating-button input[type="radio"] {
      position: absolute;
      opacity: 0;
    }
    .rating-label {
      display: inline-block;
      width: 50px;
      height: 50px;
      line-height: 50px;
      text-align: center;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      background-color: #fff;
      transition: all 0.2s;
      font-weight: 600;
      color: #6b7280;
    }
    .rating-button input[type="radio"]:checked + .rating-label {
      background-color: #2563eb;
      color: white;
      border-color: #2563eb;
    }
    .rating-button:hover .rating-label {
      border-color: #2563eb;
      transform: scale(1.05);
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1e293b;
    }
    textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      transition: border-color 0.2s;
    }
    textarea:focus {
      outline: none;
      border-color: #2563eb;
    }
    .submit-button {
      background-color: #2563eb;
      color: white;
      padding: 14px 32px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 30px;
      transition: background-color 0.2s;
    }
    .submit-button:hover {
      background-color: #1e40af;
    }
    .date {
      color: #6b7280;
      font-size: 14px;
      margin-top: 10px;
    }
    @media (max-width: 600px) {
      .container {
        padding: 20px;
      }
      h1 {
        font-size: 24px;
      }
      .rating-label {
        width: 45px;
        height: 45px;
        line-height: 45px;
      }
    }
  `;
}

module.exports = router;
