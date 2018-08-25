const express = require('express');
const passport = require('passport');
const auth = require('./routes/auth');
const session = require('express-session');
const config = require('config');

const app = express();
app.use(passport.initialize());
app.use(session({secret: config.SESSION_SECRET}));
app.use(passport.session());
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

function isAuthenticated(req, res, next){
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/auth/login');
    }
}

app.use('/auth', auth);
app.get('/', (req, res) => {
    res.status(200).send('Hello, world!').end();
});

const PORT = process.env.PORT || 8080;
app.listen(PORT);
