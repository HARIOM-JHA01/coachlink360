require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const webhookRoutes = require("./routes/webhook");
const surveyRoutes = require("./routes/survey");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/webhook", webhookRoutes);
app.use("/api/survey", surveyRoutes);
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);
app.use("/admin", adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server after verifying DB connectivity
const db = require("./db");

async function startServer() {
  try {
    await db.testConnection();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    console.error("Failed to start server due to DB connection error");
    process.exit(1);
  }
}

startServer();
