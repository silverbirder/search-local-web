import express from 'express';
import {google} from 'googleapis';
import config from 'config';
import request from 'request';
import cheerio from 'cheerio';
import {refreshToken} from './auth';

const oauth2Client = new google.auth.OAuth2(config.CLIENT_ID, config.CLIENT_SECRET, config.CLIENT_CALLBACK_BASE_URL + '/' + config.CLIENT_CALLBACK_URL_PARH);
const drive = google.drive({ version: 'v2', auth: oauth2Client });
const router = express.Router();
const workDirName = 'ma-web-tools.appspot.com'

router.post('/v1/getData', async (req, res) => {
  if(!req.user || !req.user.accessToken) {
    res.writeHead(401);
    res.end();
    return;
  }
  const user = await refreshToken(req.user);
  setCredentials(oauth2Client, user.accessToken);
  const result = await search(req.body.word).catch(err => {
    return [];
  });
  let items = [];
  for(var i in result) {
    items.push({
      title: result[i].title,
      link: result[i].description,
    });
  }
  res.render('../views/items.ejs', {items: items});
});


router.post('/v1/saveData', async (req, res) => {
  if(!req.user || !req.user.accessToken) {
    res.writeHead(401);
    res.end();
    return;
  }
  const user = await refreshToken(req.user);
  setCredentials(oauth2Client, user.accessToken);
  const url = req.body.url;
  const body = await promiseRequest(url);
  const $ = cheerio.load(body)
  const id = await getWorkDirId();
  const title = $("title").text();
  const webContents = $("body").text();
  await save(title, 'application/vnd.google-apps.document', 'text/plain', id, webContents, url);
  res.writeHead(200);
  res.end();
  return;
});

async function promiseRequest(url) {
  return new Promise((resolve, reject) => {
    request(url, (err, response, body) => {
      if (err) {
        reject();
        return;
      }
      resolve(body);
      return;
    });
  })
};

function setCredentials(client, token) {
  client.setCredentials({
    refresh_token: token
  })
}

async function getWorkDirId() {
  const id = await findWorkDir().catch(createWorkDir).catch(() => { return null; });
  return id;
};

async function save(title, mimeType, mediaMimeType, folderId, webContents, description) {
  return new Promise((resolve, reject) => {
    drive.files.insert({
      resource: {
        title: title,
        mimeType: mimeType,
        parents: [
          {
            id: folderId
          }
        ],
        description: description,
      },
      media: {
        mimeType: mediaMimeType,
        body: webContents
      }  
    }, (err, res) => {
      if (err) {
        console.log(err);
        reject();
        return;
      }
      if(!lookup(res, 'data.id')) {
        reject();
        return;
      }
      resolve(res.data.id);
      return;
    });
  });
};

async function search(word) {
  const id = await getWorkDirId();
  const items = await searchInWorkDir(id, word).catch(() => { return [];});
  return items;
}

async function findWorkDir() {
  return new Promise((resolve, reject) => {
    drive.files.list({
      q: "title = '" + workDirName + "' and trashed = false"
    },function(err,res){
      if (err) {
        reject();
        return;
      }
      if(!lookup(res, 'data.items')) {
        reject();
        return;
      }
      if(res.data.items.length == 0) {
        reject();
        return;
      }
      resolve(res.data.items[0].id);
    });
  });
}

function createWorkDir() {
  return new Promise((resolve, reject) => {
    drive.files.insert({
      resource: {
        title: workDirName,
        mimeType: 'application/vnd.google-apps.folder'
      }
    }, (err, res) => {
      if (err) {
        reject();
        return;
      }
      if(!lookup(res, 'data.id')) {
        reject();
        return;
      }
      resolve(res.data.id);
    });
  });
}

function searchInWorkDir(workDirId, word) {
  return new Promise((resolve, reject) => {
    drive.files.list({
      q: "fullText contains '" + word + "' and '" + workDirId + "' in parents and trashed = false"
    },function(err,res){
      if (err) {
        reject();
        return;
      }
      if(!lookup(res, 'data.items')) {
        resolve([]);
        return;
      }
      resolve(res.data.items);
    });
  });
}

function lookup (obj, path) {
  if (!obj) { return false; }
  const keys = path.split('.');
  for (let k in keys) {
    const key = keys[k];

    if (!obj.hasOwnProperty(key)) { return false; }

    if (keys.length > 1) {
      return lookup(obj[key], keys.splice(1).join('.'));
    }
    return true;
  }
};

export default router;