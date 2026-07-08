# Submission

Send to **varun@groweasy.ai** before 12 July 2026.

---

**Subject:** Software Developer Intern Assignment — Ashraf Ahmed

**Body:**

Hi Varun,

I've finished the CSV Importer assignment. Here's everything:

- **Hosted application URL:** https://groweasy-csv-importer-amber.vercel.app
- **GitHub repository URL:** https://github.com/AshrafAhmed9/groweasy-csv-importer
- **Position applying for:** Software Developer Intern

A quick note on what I focused on beyond the base requirements — I implemented all of the bonus items (drag & drop, live progress via SSE, retry logic for failed AI batches, a virtualized table for large files, dark mode, unit tests, Docker, and the deployment itself). Beyond that, I added a column-mapping panel so you can see exactly how the AI interpreted each source column rather than just trusting a black box, and every field the AI returns gets re-validated in code afterward (enum checks, date parsing, email/mobile checks) instead of being passed straight through. There are 5 sample CSVs in different real-world formats bundled into the app as one-click buttons, so you can try it without needing to find or make a test file yourself.

The README covers the architecture and setup in more detail.

Thanks for taking the time to review this — happy to walk through any part of it.

Best,
Ashraf Ahmed
ashrafahmed1232@gmail.com

---

## Checklist before sending

- [x] Backend live on Render, `/health` returns 200
- [x] Frontend live on Vercel, pointed at the Render backend
- [x] UptimeRobot pinging `/health` so the backend doesn't cold-start on the reviewer
- [x] Ran the full upload → preview → confirm → results flow on the live URL, not just localhost
- [x] GitHub repo is public
- [x] README has the real URLs, not placeholders
- [ ] Actually send the email
