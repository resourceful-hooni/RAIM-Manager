const { initializeApp } = require('firebase/app');
const { initializeFirestore, persistentLocalCache, getDoc, doc } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
try {
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
  }, config.firestoreDatabaseId);
  getDoc(doc(db, 'test/connection')).then(d => {
    console.log('Doc exists:', d.exists());
    process.exit(0);
  }).catch(e => {
    console.error('Fetch error:', e);
    process.exit(1);
  });
} catch(e) {
  console.error("Init Error:", e);
}
