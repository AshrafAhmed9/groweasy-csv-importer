# Submission

Send to **varun@groweasy.ai** before **12 July 2026**.

---

**Subject:** Software Developer Intern Assignment Submission — Ashraf Ahmed

**Body:**

Hi Varun,

I've completed the AI-powered CSV Importer assignment. Details below:

- **Hosted application URL:** _fill in after Vercel deploy_
- **GitHub repository URL:** _fill in after pushing to GitHub_
- **Position applying for:** Software Developer Intern

A few things I focused on beyond the core requirements:

- All bonus items implemented (drag & drop, live SSE progress, retry-on-failure for AI batches, virtualized table, dark mode, unit tests, Docker, deployment).
- A column-mapping transparency panel showing exactly how the AI interpreted each source column.
- Deterministic re-validation of every AI-returned field (enum coercion, date/email/mobile checks) rather than trusting the LLM output directly.
- 5 sample CSVs in different real-world formats (Facebook leads, Google Ads, real-estate CRM, a deliberately messy sales report, and a manual spreadsheet) bundled in-app as one-click try buttons for quick evaluation.

README with architecture notes and setup instructions is in the repo root.

Thanks for the opportunity — looking forward to hearing from you.

Best,
Ashraf Ahmed
ashrafahmed1232@gmail.com

---

## Pre-send checklist

- [ ] Backend deployed to Render, `/health` returns 200
- [ ] Frontend deployed to Vercel, `NEXT_PUBLIC_API_URL` points at the live backend
- [ ] UptimeRobot monitor configured on the Render `/health` endpoint
- [ ] Ran the full upload → preview → confirm → results flow on the **live** URL (not just localhost)
- [ ] GitHub repo is public
- [ ] README links updated with the real hosted URLs
- [ ] Filled in the two blanks above and sent the email
