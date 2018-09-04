import Datastore from '@google-cloud/datastore';
import config from 'config';

const projectId = config.PROJECT_ID;
const datastore = new Datastore({
  projectId: projectId,
});
const kind = 'User';

export function saveUser(user) {
  const name = user.id;
  const userKey = datastore.key([kind, name]);
  return new Promise((resolve, reject) => {
    datastore.save({
      key: userKey,
      data: user
    }).then(() => {
      resolve();
    }).catch(err => {
      reject();
    })  
  })
}

export function findUser(id) {
  const query = datastore.createQuery(kind).filter('id', id).limit(1);
  return new Promise((resolve, reject) => {
    datastore.runQuery(query).then(results => {
      const user = results[0][0];
      delete user[datastore.KEY];
      resolve(user);
    }).catch(() => {
      reject();
    });  
  });
}

