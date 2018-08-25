const express = require("express");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const config = require('config');
const {google} = require('googleapis');

function extractProfile(profile) {
    let imageUrl = '';
    if (profile.photos && profile.photos.length) {
        imageUrl = profile.photos[0].value;
    }
    return {
        id: profile.id,
        displayName: profile.displayName,
        image: imageUrl,
    };
}

passport.use(new GoogleStrategy({
    clientID: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET,
    callbackURL: config.CLIENT_CALLBACK_URL,
    accessType: 'offline',
}, function (accessToken, refreshToken, profile, done) {
    if (profile) {
        return done(null, profile);
    }
    else {
        return done(null, false);
    }
}));

const router = express.Router();

router.get('/login',
    passport.authenticate('google', { scope: ['email', 'profile', 'https://www.googleapis.com/auth/drive'], session: false, }),
);

router.get('/google/callback', passport.authenticate('google'), (req, res) => {
    res.redirect("/");
});
module.exports = router;
