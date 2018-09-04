import express from 'express';
import {google} from 'googleapis';
import config from 'config';
import {findUser} from './db';

const oauth2Client = new google.auth.OAuth2(config.CLIENT_ID, config.CLIENT_SECRET, config.CLIENT_CALLBACK_BASE_URL + '/' + config.CLIENT_CALLBACK_URL_PARH);
const drive = google.drive({ version: 'v2', auth: oauth2Client });
const router = express.Router();
const workDirName = 'ma-web-tools.appspot.com'

router.post('/save',async (req, res) => {
  const url = req.body.url,
        id = req.body.id,
        pc = req.body.pc,
        sp = req.body.sp;
  if (!url || !id || !pc || !sp) {
    return res.json({'message': 'invalid post parameter'});
  }
  const accessToken = await findUser(id);
  setCredentials(oauth2Client, accessToken);
  res.json({'message': 'ok'});
});

function setCredentials(client, token) {
  client.setCredentials({
    refresh_token: token
  })
}

async function getWorkDirId() {
  const id = await findWorkDir().catch(createWorkDir).catch(() => { return null; });
  return id;
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

// function save(title, mimeType, folderId, file) {
//   return new Promise((resolve, reject) => {
//     drive.files.insert({
//       resource: {
//         title: title,
//         mimeType: mimeType,
//         parents: [
//           {
//             id: folderId
//           }
//         ],
//         media: {
//           mimeType: mimeType,
//           body: file
//         }
//       }
//     }, (err, res) => {
//       if (err) {
//         reject();
//         return;
//       }
//       if(!lookup(res, 'data.id')) {
//         reject();
//         return;
//       }
//       resolve(res.data.id);
//     });
//   });
// };

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