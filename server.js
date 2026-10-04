require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------- Database model (Step 4: store profiles) ---------- */
const profileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    bio: { type: String, default: "", maxlength: 300 },
    skills: [String],
    links: {
      github: String,
      linkedin: String,
      twitter: String,
      website: String,
    },
    avatarColor: String,
  },
  { timestamps: true },
);
const Profile = mongoose.model("Profile", profileSchema);

/* ---------- String manipulation helpers (Step 2) ---------- */
const escapeHtml = (s = "") =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// "  john   DOE " -> "John Doe"
const formatName = (s = "") =>
  s
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// "html, CSS ,js,, html" -> ["Html","Css","Js"] (trimmed, deduped, max 12)
const parseSkills = (s = "") => {
  const seen = new Set();
  return s
    .split(",")
    .map((x) => x.trim().replace(/\s+/g, " "))
    .filter((x) => x && x.length <= 30)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .filter((x) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))
    .slice(0, 12);
};

// Accepts "github.com/me" or "https://github.com/me"; rejects anything not http(s)
const cleanUrl = (s = "") => {
  s = s.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

const colorFor = (name) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 55%, 42%)`;
};

/* ---------- HTML rendering (Step 3: dynamic cards) ---------- */
const layout = (title, body) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
</head><body>
<header class="top"><a class="brand" href="/">Profile Cards</a>
<nav><a href="/">Create</a><a href="/profiles">All profiles</a></nav></header>
<main>${body}</main>
</body></html>`;

const linkLabels = {
  github: "GitHub",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  website: "Website",
};

const renderCard = (p) => {
  const links = Object.entries(p.links || {})
    .filter(([, url]) => url)
    .map(
      ([k, url]) =>
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${linkLabels[k]}</a>`,
    )
    .join("");
  const skills = (p.skills || [])
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("");
  return `<article class="card">
  <div class="avatar" style="background:${escapeHtml(p.avatarColor)}">${escapeHtml(initials(p.name))}</div>
  <h2><a href="/profile/${p._id}">${escapeHtml(p.name)}</a></h2>
  ${p.bio ? `<p class="bio">${escapeHtml(p.bio)}</p>` : ""}
  ${skills ? `<ul class="skills">${skills}</ul>` : ""}
  ${links ? `<div class="links">${links}</div>` : ""}
</article>`;
};

/* ---------- Routes ---------- */
const formPage = (error = "", v = {}) =>
  layout(
    "Create a profile card",
    `
<section class="split">
  <div class="intro">
    <h1>Turn your details into a profile card.</h1>
    <p>Fill in the form. The server cleans up your input, saves it, and builds your card.</p>
  </div>
  <form method="POST" action="/profiles" class="form">
    ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
    <label>Name<input name="name" required maxlength="60" value="${escapeHtml(v.name)}" placeholder="Priya Sharma"></label>
    <label>Bio<textarea name="bio" rows="3" maxlength="300" placeholder="Full-stack developer who loves clean APIs.">${escapeHtml(v.bio)}</textarea></label>
    <label>Skills <small>(separate with commas)</small><input name="skills" value="${escapeHtml(v.skills)}" placeholder="JavaScript, Node.js, MongoDB"></label>
    <fieldset><legend>Social links <small>(optional)</small></legend>
      <input name="github" value="${escapeHtml(v.github)}" placeholder="github.com/username">
      <input name="linkedin" value="${escapeHtml(v.linkedin)}" placeholder="linkedin.com/in/username">
      <input name="twitter" value="${escapeHtml(v.twitter)}" placeholder="x.com/username">
      <input name="website" value="${escapeHtml(v.website)}" placeholder="yourwebsite.com">
    </fieldset>
    <button type="submit">Create my card</button>
  </form>
</section>`,
  );

app.get("/", (req, res) => res.send(formPage()));

app.post("/profiles", async (req, res) => {
  const b = req.body;
  const name = formatName(b.name);
  if (!name)
    return res.status(400).send(formPage("Please enter your name.", b));
  try {
    const profile = await Profile.create({
      name,
      bio: (b.bio || "").trim().replace(/\s+/g, " ").slice(0, 300),
      skills: parseSkills(b.skills),
      links: {
        github: cleanUrl(b.github),
        linkedin: cleanUrl(b.linkedin),
        twitter: cleanUrl(b.twitter),
        website: cleanUrl(b.website),
      },
      avatarColor: colorFor(name),
    });
    res.redirect(`/profile/${profile._id}`);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send(formPage("Could not save your profile. Please try again.", b));
  }
});

app.get("/profile/:id", async (req, res) => {
  try {
    const p =
      mongoose.isValidObjectId(req.params.id) &&
      (await Profile.findById(req.params.id).lean());
    if (!p)
      return res
        .status(404)
        .send(
          layout(
            "Not found",
            '<h1>Profile not found</h1><p><a href="/">Create a new one</a></p>',
          ),
        );
    res.send(
      layout(
        p.name,
        `<section class="single">${renderCard(p)}
      <p class="actions"><a href="/">Create another</a> <a href="/profiles">See all profiles</a></p></section>`,
      ),
    );
  } catch (err) {
    console.error(err);
    res.status(500).send(layout("Error", "<h1>Something went wrong</h1>"));
  }
});

app.get("/profiles", async (req, res) => {
  try {
    const list = await Profile.find().sort({ createdAt: -1 }).limit(60).lean();
    const body = list.length
      ? `<h1>All profiles</h1><div class="grid">${list.map(renderCard).join("")}</div>`
      : '<h1>No profiles yet</h1><p><a href="/">Create the first card</a></p>';
    res.send(layout("All profiles", body));
  } catch (err) {
    console.error(err);
    res.status(500).send(layout("Error", "<h1>Something went wrong</h1>"));
  }
});

// JSON endpoint (handy for testing / showing in your demo)
app.get("/api/profiles", async (req, res) =>
  res.json(await Profile.find().sort({ createdAt: -1 }).lean()),
);

/* ---------- Start ---------- */
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`),
    );
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
