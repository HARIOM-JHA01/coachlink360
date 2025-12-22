const express = require("express");
const router = express.Router();
const db = require("../db");
const { v4: uuidv4 } = require("uuid");
const { sendSurveyEmail } = require("../services/emailService");

// POST endpoint - receive meeting data
router.post("/", async (req, res) => {
  try {
    const meetingData = req.body;

    console.log("Webhook received:", {
      session_id: meetingData.session_id,
      trigger: meetingData.trigger,
      participants: meetingData.participants?.length || 0,
    });

    // Store meeting data
    const meetingResult = await db.query(
      `INSERT INTO meetings (session_id, meeting_data) 
       VALUES ($1, $2) 
       ON CONFLICT (session_id) DO UPDATE SET meeting_data = $2
       RETURNING id`,
      [meetingData.session_id || uuidv4(), JSON.stringify(meetingData)]
    );

    const meetingId = meetingResult.rows[0].id;

    // Extract participants
    const participants = meetingData.participants || [];
    const validParticipants = participants.filter((p) => p.email);

    if (validParticipants.length === 0) {
      return res.json({
        success: true,
        message: "Meeting data stored, but no participants with email found",
        meeting_id: meetingId,
      });
    }

    // Send survey emails to each participant
    const emailPromises = validParticipants.map(async (participant) => {
      const token = uuidv4();

      try {
        // Store survey invite - update token on conflict so email matches DB
        const inviteResult = await db.query(
          `INSERT INTO survey_invites (meeting_id, participant_name, participant_email, token)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (meeting_id, participant_email) 
           DO UPDATE SET token = $4, sent_at = NOW()
           RETURNING token`,
          [meetingId, participant.name, participant.email, token]
        );

        const actualToken = inviteResult.rows[0].token;

        // Send email with the actual token from database
        const emailResult = await sendSurveyEmail(
          participant.email,
          participant.name,
          meetingData.title || "Recent Meeting",
          actualToken
        );

        // Update with Resend email ID
        if (emailResult?.id) {
          await db.query(
            `UPDATE survey_invites SET resend_email_id = $1 WHERE token = $2`,
            [emailResult.id, actualToken]
          );
        }

        return {
          email: participant.email,
          status: "sent",
          emailId: emailResult?.id,
        };
      } catch (error) {
        console.error(`Failed to send email to ${participant.email}:`, error);
        return {
          email: participant.email,
          status: "failed",
          error: error.message,
        };
      }
    });

    const emailResults = await Promise.all(emailPromises);

    res.json({
      success: true,
      message: "Meeting data received and survey emails sent",
      meeting_id: meetingId,
      emails_sent: emailResults.filter((r) => r.status === "sent").length,
      emails_failed: emailResults.filter((r) => r.status === "failed").length,
      details: emailResults,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET endpoint - for testing/debugging
router.get("/", (req, res) => {
  res.json({
    message: "Webhook endpoint is active",
    usage: "Send POST request with meeting data",
    example: {
      session_id: "unique-session-id",
      title: "Meeting Title",
      participants: [{ name: "John Doe", email: "john@example.com" }],
    },
  });
});

module.exports = router;
