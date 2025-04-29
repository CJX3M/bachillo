// Fetch all reports
// app.get("/api/reports", async (req, res) => {
//   const snapshot = await db.collection("reports").get();
//   const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
//   res.json(reports);
// });

// Optional: Webhook for future Twitter bot integration
// app.post("/api/twitter-webhook", (req, res) => { ... });