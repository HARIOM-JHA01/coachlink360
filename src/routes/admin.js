const express = require("express");
const router = express.Router();
const db = require("../db");

// Middleware: if ADMIN_TOKEN is set, require it via header 'x-admin-token' or ?token query param
function requireAdmin(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return next(); // no token set, allow

  const provided = req.get("x-admin-token") || req.query.token;
  if (!provided || provided !== adminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// API: GET /api/admin/responses
// Query params: page (default 1), limit (default 50), q (search by email or meeting title)
router.get("/responses", async (req, res) => {
  try {
    // If an id query parameter is provided, return a single response (compatibility for View button)
    const id = req.query.id;
    if (id) {
      const query = `
        SELECT sr.*, si.participant_email, si.participant_name, m.id as meeting_id, m.meeting_data
        FROM survey_responses sr
        JOIN survey_invites si ON sr.survey_invite_id = si.id
        JOIN meetings m ON si.meeting_id = m.id
        WHERE sr.id = $1
        LIMIT 1`;

      const result = await db.query(query, [id]);
      if (result.rows.length === 0)
        return res.status(404).json({ success: false, error: "Not found" });
      return res.json({ success: true, result: result.rows[0] });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = (page - 1) * limit;
    const q = req.query.q ? req.query.q.trim() : null;

    // Build query
    let whereClause = "";
    const dataParams = [limit, offset];
    const countParams = [];

    if (q) {
      whereClause = `WHERE (si.participant_email ILIKE $3 OR (m.meeting_data->>'title') ILIKE $3)`;
      dataParams.push(`%${q}%`);
      countParams.push(`%${q}%`);
    }

    const dataQuery = `
      SELECT sr.id, sr.submitted_at, sr.punctuality, sr.listening_understanding, sr.knowledge_expertise,
             sr.clarity_answers, sr.overall_value, sr.most_valuable, sr.improvements, sr.response_data,
             si.participant_email, si.participant_name, m.id as meeting_id, m.meeting_data->>'title' AS meeting_title
      FROM survey_responses sr
      JOIN survey_invites si ON sr.survey_invite_id = si.id
      JOIN meetings m ON si.meeting_id = m.id
      ${whereClause}
      ORDER BY sr.submitted_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM survey_responses sr
      JOIN survey_invites si ON sr.survey_invite_id = si.id
      JOIN meetings m ON si.meeting_id = m.id
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, dataParams),
      db.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].total, 10) || 0;

    res.json({
      success: true,
      page,
      limit,
      total,
      results: dataResult.rows,
    });
  } catch (err) {
    console.error("Error fetching responses:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch responses" });
  }
});

// Admin page: GET /admin/
router.get("/", async (req, res) => {
  // Simple HTML page that uses fetch to call API and render
  res.send(`
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Survey Responses - Admin</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:20px}
        table{width:100%;border-collapse:collapse}
        th,td{padding:8px;border:1px solid #e6e6e6;text-align:left}
        th{background:#f7f7f7}
        .controls{margin-bottom:12px}
        .small{font-size:0.9em;color:#666}
      </style>
    </head>
    <body>
      <h1>Survey Responses</h1>
      <div class="controls">
        <input id="q" placeholder="Search by email or meeting title" style="width:300px;padding:6px" />
        <button id="search">Search</button>
        <button id="refresh">Refresh</button>
        <span class="small">(Page <span id="page">1</span>)</span>
      </div>
      <div id="summary" class="small"></div>
      <div style="overflow:auto;max-height:70vh">
        <table id="results">
          <thead>
            <tr>
              <th>Submitted At</th>
              <th>Participant</th>
              <th>Meeting</th>
              <th>Scores</th>
              <th>Most Valuable</th>
              <th>Improvements</th>
              <th>Raw</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <script>
        const pageEl = document.getElementById('page');
        let page = 1;
        const limit = 50;
        const qInput = document.getElementById('q');

        async function fetchPage() {
          const q = qInput.value.trim();
          const token = new URLSearchParams(location.search).get('token') || '';
          // Build URL with plain string concatenation to avoid nested template literals
          const url = '/api/admin/responses?page=' + page + '&limit=' + limit + (q ? '&q=' + encodeURIComponent(q) : '') + (token ? '&token=' + encodeURIComponent(token) : '');
          const res = await fetch(url, { headers: token ? { 'x-admin-token': token } : {} });
          const data = await res.json();
          if (!data.success) {
            document.getElementById('summary').innerText = 'Failed to load responses';
            return;
          }
          pageEl.innerText = data.page;
          document.getElementById('summary').innerText = 'Showing ' + data.results.length + ' of ' + data.total + ' responses';
          const tbody = document.querySelector('#results tbody');
          tbody.innerHTML = '';

          data.results.forEach(function(r) {
            const tr = document.createElement('tr');
            const scores = [r.punctuality, r.listening_understanding, r.knowledge_expertise, r.clarity_answers, r.overall_value].join(' / ');
            tr.innerHTML = '<td>' + new Date(r.submitted_at).toLocaleString() + '</td>' +
                           '<td>' + (r.participant_name || '') + '<br/><small>' + (r.participant_email || '') + '</small></td>' +
                           '<td>' + (r.meeting_title || '') + '</td>' +
                           '<td>' + scores + '</td>' +
                           '<td>' + escapeHtml(r.most_valuable || '') + '</td>' +
                           '<td>' + escapeHtml(r.improvements || '') + '</td>' +
                           '<td><button data-id="' + r.id + '">View</button></td>';
            tbody.appendChild(tr);
          });

          document.querySelectorAll('#results button[data-id]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const id = btn.getAttribute('data-id');
              const token = new URLSearchParams(location.search).get('token') || '';
              const url = '/api/admin/responses?id=' + id + (token ? '&token=' + encodeURIComponent(token) : '');
              const res = await fetch(url, { headers: token ? { 'x-admin-token': token } : {} });
              const data = await res.json();
              if (data.success && data.result) {
                alert(JSON.stringify(data.result, null, 2));
              } else {
                alert('Failed to load response');
              }
            });
          });
        }

        document.getElementById('search').addEventListener('click', () => { page = 1; fetchPage(); });
        document.getElementById('refresh').addEventListener('click', () => fetchPage());

        function escapeHtml(unsafe) {
          return unsafe
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
        }

        // Support fetching single item by id via ?id= on /api/admin/responses
        // initial load
        fetchPage();
      </script>
    </body>
  </html>
  `);
});

module.exports = router;
