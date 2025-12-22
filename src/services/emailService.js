const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const generateSurveyEmailHTML = (participantName, meetingTitle, surveyUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Meeting Feedback Survey</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2563eb;
      font-size: 24px;
      margin-bottom: 10px;
    }
    h2 {
      color: #1e40af;
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .intro {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .meeting-title {
      background-color: #f0f9ff;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #2563eb;
    }
    .cta-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 600;
      margin: 25px 0;
      text-align: center;
    }
    .cta-button:hover {
      background-color: #1e40af;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    .emoji {
      font-size: 20px;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1><span class="emoji">🧩</span>Customer Meeting Feedback Survey</h1>
    
    <p class="intro">
      Hi ${participantName},<br><br>
      Thank you for taking a moment to share your feedback about your recent meeting with our team.
      Your input helps us improve and make every interaction more valuable.
    </p>

    <div class="meeting-title">
      <strong>Meeting:</strong> ${meetingTitle}
    </div>

    <p>
      We'd love to hear your thoughts. The survey will take just 2-3 minutes to complete.
    </p>

    <center>
      <a href="${surveyUrl}" class="cta-button">Take the Survey</a>
    </center>

    <h2>What you'll be asked:</h2>
    <ul style="color: #4b5563;">
      <li>Rate your experience on punctuality, listening, knowledge, clarity, and overall value (1-5 scale)</li>
      <li>Share what you found most valuable</li>
      <li>Suggest improvements for future meetings</li>
    </ul>

    <div class="footer">
      <p>
        If you have any questions or concerns, please don't hesitate to reach out.<br>
        <br>
        Best regards,<br>
        The CoachLink360 Team
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

const sendSurveyEmail = async (to, participantName, meetingTitle, token) => {
  try {
    const surveyUrl = `${process.env.BASE_URL}/api/survey/${token}`;
    const html = generateSurveyEmailHTML(
      participantName,
      meetingTitle,
      surveyUrl
    );

    const result = await resend.emails.send({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: [to],
      subject: `Feedback Request: ${meetingTitle}`,
      html: html,
    });
    console.log(result);
    console.log(`Survey email sent to ${to}:`, result.id);
    return result;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    throw error;
  }
};

module.exports = {
  sendSurveyEmail,
  generateSurveyEmailHTML,
};
