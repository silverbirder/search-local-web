import express from 'express';

// [START setup]
import passport from 'passport';
import passportGoogleOauth2 from 'passport-google-oauth20';
import refresh from 'passport-oauth2-refresh';
import path from 'path';
import config from 'config';
import {saveUser, findUser} from './db';

const router = express.Router();

const GoogleStrategy = passportGoogleOauth2.Strategy;
const scope = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive',
];
const nowFileName = splitExt(path.basename(__filename))[0];
const callbackPathExcludeDir = config.CLIENT_CALLBACK_URL_PARH.replace(nowFileName, '');
const strategy = new GoogleStrategy({
    clientID: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET,
    callbackURL: config.CLIENT_CALLBACK_BASE_URL + '/' + config.CLIENT_CALLBACK_URL_PARH,
    accessType: 'offline',
  }, (accessToken, refreshToken, profile, done) => {
    const user = {
      accessToken,
      refreshToken,
    };
    Object.assign(user, extractProfile(profile));
    saveUser(user).then(() => {
      done(null, user);
    });
  });

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

function splitExt(filename) {
  return filename.split(/\.(?=[^.]+$)/);
}

export function isAuthenticated(req, res, next){
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect(config.CLIENT_CALLBACK_BASE_URL + '/' + nowFileName + '/login');
  }
}

passport.use(strategy);
refresh.use(strategy);

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  findUser(id).then(user => {
    done(null, user);
  })
});

router.get('/login', passport.authenticate('google', { scope: scope }),);
router.get(callbackPathExcludeDir, passport.authenticate('google', { scope: scope }),
  (req, res) => {
      const redirect = req.session.oauth2return || '/';
      delete req.session.oauth2return;
      res.redirect(redirect);
  },
);

export default router;