const db = require("./index");

const createTables = async () => {
  try {
    console.log("Running database migrations...");

    // Create meetings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE,
        meeting_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index on session_id
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_meetings_session_id ON meetings(session_id);
    `);

    // Create survey_invites table
    await db.query(`
      CREATE TABLE IF NOT EXISTS survey_invites (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        participant_name VARCHAR(255),
        participant_email VARCHAR(255),
        token VARCHAR(255) UNIQUE NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        resend_email_id VARCHAR(255),
        UNIQUE(meeting_id, participant_email)
      );
    `);

    // Create index on token
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_survey_invites_token ON survey_invites(token);
    `);

    // Create survey_responses table
    await db.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id SERIAL PRIMARY KEY,
        survey_invite_id INTEGER REFERENCES survey_invites(id) ON DELETE CASCADE,
        punctuality INTEGER CHECK (punctuality >= 1 AND punctuality <= 5),
        listening_understanding INTEGER CHECK (listening_understanding >= 1 AND listening_understanding <= 5),
        knowledge_expertise INTEGER CHECK (knowledge_expertise >= 1 AND knowledge_expertise <= 5),
        clarity_answers INTEGER CHECK (clarity_answers >= 1 AND clarity_answers <= 5),
        overall_value INTEGER CHECK (overall_value >= 1 AND overall_value <= 5),
        most_valuable TEXT,
        improvements TEXT,
        response_data JSONB,
        submitted_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✓ Database migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
};

createTables();
