import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import passport from 'passport';
import config from 'config';
import favicon from 'serve-favicon';
import path from 'path';
import { default as auth, isAuthenticated} from './routes/auth';
import api from './routes/api';

const app = express();
const port = process.env.PORT || 8080;

/* [START passport setting] */
app.use(session({secret: config.SESSION_SECRET}))
app.use(passport.initialize());
app.use(passport.session());
/* [END passport setting] */

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

// Routing
app.use('/auth', auth);
app.use('/api', api);

// Application Root
app.get('/',
  isAuthenticated,
  (req, res) => {
    res.render("./index.ejs")
});

app.listen(port, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.info(`==> Listening on port ${port}. Open up http://localhost:${port}/ in your browser.`);
  }
});
