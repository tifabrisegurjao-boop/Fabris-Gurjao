import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./service-account.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function testLongName() {
    // Generate a very long name (e.g. 2000 characters)
    const longName = "A".repeat(2000);

    try {
        const clientsRef = db.collection('clients');
        const clientSnap = await clientsRef.where('name', '==', longName).get();
        console.log("Query success. Empty:", clientSnap.empty);
    } catch (err) {
        console.error("Query Error:", err.message);
    }
}

testLongName().catch(console.error);
