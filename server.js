const express = require("express");
const session = require("express-session");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const BASE_URL = (process.env.BASE_URL || "").replace(/\/+$/, "");
const steamAuthReady = Boolean(STEAM_API_KEY && BASE_URL);

const app = express();
app.set("trust proxy", 1);
app.use(express.static("public"));

app.use(session({
    secret: "my-test-secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

function renderAuthError(res, message, status = 500) {
    res.status(status).send(`
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Steam login error</title>
            <style>
                body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07030f;color:#f8f4ff;font-family:Arial,sans-serif}
                .card{width:min(520px,92vw);padding:28px;border-radius:20px;background:linear-gradient(180deg,#1b1030,#08040f);border:1px solid rgba(168,85,247,.45);box-shadow:0 0 45px rgba(168,85,247,.22);text-align:center}
                h1{margin:0 0 12px;font-size:28px}
                p{margin:0 0 20px;color:#c4b5fd;line-height:1.45}
                a{display:inline-flex;align-items:center;justify-content:center;height:44px;padding:0 18px;border-radius:12px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:800}
            </style>
        </head>
        <body>
            <main class="card">
                <h1>Steam login failed</h1>
                <p>${message}</p>
                <a href="/">Back to Drop Empire</a>
            </main>
        </body>
        </html>
    `);
}

if (steamAuthReady) {
    passport.use(new SteamStrategy({
        returnURL: `${BASE_URL}/auth/steam/return`,
        realm: `${BASE_URL}/`,
        apiKey: STEAM_API_KEY
    }, (identifier, profile, done) => {
        return done(null, profile);
    }));
} else {
    console.warn("Steam auth is disabled: set STEAM_API_KEY and BASE_URL env variables.");
}

app.get("/auth/steam",
    (req, res, next) => {
        if (!steamAuthReady) {
            return renderAuthError(res, "Steam login is not configured on the server. Missing STEAM_API_KEY or BASE_URL.", 503);
        }
        passport.authenticate("steam")(req, res, next);
    }
);

app.get(
    "/auth/steam/return",
    (req, res, next) => {
        if (!steamAuthReady) {
            return renderAuthError(res, "Steam login is not configured on the server. Missing STEAM_API_KEY or BASE_URL.", 503);
        }

        passport.authenticate("steam", (err, user) => {
            if (err) {
                console.error("Steam auth error:", err);
                return renderAuthError(res, "Steam did not confirm the login. Check BASE_URL, Steam API key and callback URL.");
            }

            if (!user) {
                return renderAuthError(res, "Steam login was cancelled or rejected.", 401);
            }

            req.logIn(user, (loginErr) => {
                if (loginErr) {
                    console.error("Steam session error:", loginErr);
                    return renderAuthError(res, "Steam login worked, but the server could not create a session.");
                }

                return res.redirect("/");
            });
        })(req, res, next);
    }
);

app.get("/api/user", (req, res) => {
    if (!req.user) {
        return res.json({
            loggedIn: false
        });
    }

    res.json({
        loggedIn: true,
        name: req.user.displayName,
        steamId: req.user.id,
        avatar:
            req.user.photos?.[2]?.value ||
            req.user.photos?.[0]?.value
    });
});

app.get("/logout", (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    renderAuthError(res, "Something went wrong on the server. Please try again in a minute.");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
