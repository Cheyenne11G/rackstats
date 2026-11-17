# RackStats — standalone web app prototype

RackStats is a responsive React/Vite web app for billiards league management, including team fixtures, 1v1 challenges, player profiles, frame-difference statistics, venue tables, match queues and an admin workspace.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). To create a production bundle:

```bash
npm run build
npm run preview
```

## Included in this build

- Dark, mobile-first dashboard and navigation
- League selector (supports up to five leagues in the admin UI)
- Team match fixtures and results
- Separate 1v1 pool challenge fixtures
- League standings with frame-difference tiebreaker
- Player directory and profiles
- Player profile photo upload
- Golden breaks, Run Out BnF, successful/dry breaks, pots made/shots taken
- Player and team frame difference
- Match Night dashboard grouped by venue table
- Queue status controls; finishing a match promotes the next queued fixture on the same table
- Admin CRUD for fixtures, 1v1 challenges, teams, players, leagues and venues
- Calendar `.ics` export and share/copy match preview text
- Sample seed data including Leonardo's Guest House League and Miguel Pillay
- Browser local-storage persistence

## Important production gaps

This is a working front-end prototype, not yet a production multi-user service. The demo data lives in the current browser's local storage and is not shared between users or devices. Before launch, connect a real database and server-side API, implement secure sign-in/roles, server-side validation and backups, and migrate any existing Base44 records.

Automated email reminders and push notifications are not live in this prototype. They require a server-side scheduler, email/push provider, player contact preferences, delivery logs and duplicate prevention. The calendar export creates a downloadable `.ics` file; it does not silently connect to anyone's Google Calendar. Google Calendar workspace connection was intentionally not added.

The seeded records are illustrative demo data and should be reviewed/replaced with verified league records before production use.
