const { initializeApp } = require('firebase/app');
const { initializeFirestore, getDoc, doc } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
getDoc(doc(db, 'test/connection')).then(d => {
  console.log('Doc exists:', d.exists());
  process.exit(0);
}).catch(e => {
  console.error('Fetch error:', e);
  process.exit(1);
});
