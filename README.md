# User Profile Card Generator

Form-based web app: user input is processed on a Node.js server, cleaned with string manipulation, stored in MongoDB, and returned as a dynamic HTML profile card.

**Stack:** Node.js, Express, MongoDB (Mongoose), HTML/CSS

## Run locally
1. Install Node.js 18+ and MongoDB (or create a free MongoDB Atlas cluster).
2. `npm install`
3. Copy `.env.example` to `.env` and set `MONGODB_URI`.
4. `npm start` then open http://localhost:3000

## Routes
| Method | Path | What it does |
|---|---|---|
| GET | `/` | Form page |
| POST | `/profiles` | Cleans input, saves to MongoDB, redirects to card |
| GET | `/profile/:id` | Shows one card |
| GET | `/profiles` | Gallery of all cards |
| GET | `/api/profiles` | JSON of all saved profiles |

## Deploy (live demo link)
1. Create a free cluster on MongoDB Atlas, allow network access (0.0.0.0/0), copy the connection string.
2. Push this repo to GitHub.
3. On Render.com: New > Web Service > connect repo. Build: `npm install`, Start: `npm start`.
4. Add environment variable `MONGODB_URI` with your Atlas string. Deploy.
