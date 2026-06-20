const express = require("express");
const session = require("express-session");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;

const STEAM_API_KEY = "38267E8D758B48F36B37D51DF9357999";
const app = express();
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

passport.use(new SteamStrategy({
 returnURL: "https://cs2-upgrader-server.onrender.com/auth/steam/return",
realm: "https://cs2-upgrader-server.onrender.com/",,
    apiKey: cs2-upgrader-server.onrender.com
}, (identifier, profile, done) => {
    return done(null, profile);
}));

app.get("/auth/steam",
    passport.authenticate("steam")
);

app.get(
    "/auth/steam/return",
    passport.authenticate("steam", { failureRedirect: "/" }),
    (req, res) => res.redirect("/")
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
