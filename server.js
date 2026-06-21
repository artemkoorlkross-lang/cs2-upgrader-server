const express = require("express");
const session = require("express-session");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;

const STEAM_API_KEY = "BC1836EB654E870330A748FC29490806";

const app = express();

const onlineUsers = new Map();
const recentUpgrades = [];

app.use(express.static("public"));
app.use(express.json());

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
   returnURL: "https://dropempire.pl/auth/steam/return",
realm: "https://dropempire.pl/",
    apiKey: STEAM_API_KEY,
}, (identifier, profile, done) => {
    return done(null, profile);
}));

app.get("/auth/steam", passport.authenticate("steam"));

app.get(
    "/auth/steam/return",
    passport.authenticate("steam", { failureRedirect: "/" }),
    (req, res) => res.redirect("/")
);

app.get("/api/user", (req, res) => {
    if (!req.user) {
        return res.json({ loggedIn: false });
    }

    res.json({
        loggedIn: true,
        name: req.user.displayName,
        steamId: req.user.id,
        avatar: req.user.photos?.[2]?.value || req.user.photos?.[0]?.value
    });
});

app.get("/api/ping", (req, res) => {
    const id = req.user?.id || req.ip;
    const now = Date.now();

    onlineUsers.set(id, now);

    for (const [key, lastSeen] of onlineUsers.entries()) {
        if (now - lastSeen > 30000) {
            onlineUsers.delete(key);
        }
    }

    res.json({ online: onlineUsers.size });
});

app.get("/api/upgrades", (req, res) => {
    res.json({ upgrades: recentUpgrades });
});

app.post("/api/upgrades", (req, res) => {
    const body = req.body || {};

    const playerName = req.user?.displayName || "Guest";
    const playerAvatar =
        req.user?.photos?.[2]?.value ||
        req.user?.photos?.[0]?.value ||
        "";

    const entry = {
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        playerName,
        playerAvatar,
        result: body.result === "WIN" ? "WIN" : "LOSS",
        itemName: String(body.itemName || "Unknown skin").slice(0, 80),
        itemPrice: Number(body.itemPrice) || 0,
        itemImage: String(body.itemImage || "").slice(0, 200),
        createdAt: Date.now()
    };

    recentUpgrades.unshift(entry);

    if (recentUpgrades.length > 30) {
        recentUpgrades.length = 30;
    }

    res.json({
        ok: true,
        upgrades: recentUpgrades
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
