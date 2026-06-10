import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./service-account.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function testLongName() {
    const longName = "Daniella Martins Locatelli de Sousa";
    
    // mimic generateContractCode
    const clientsRef = db.collection('clients');
    const clientSnap = await clientsRef.where('name', '==', longName).get();
    
    let clientCode;
    let clientId;

    console.log("Empty:", clientSnap.empty);

    if (!clientSnap.empty) {
        const clientDoc = clientSnap.docs[0];
        const d = clientDoc.data();
        clientId = clientDoc.id;

        console.log("Found client d:", d);
        if (d.code) {
            clientCode = d.code;
            console.log("Using existing code:", clientCode);
        } else {
            clientCode = Math.floor(1000 + Math.random() * 9000).toString();
            console.log("Generated code for existing client:", clientCode);
        }
    } else {
        clientCode = Math.floor(1000 + Math.random() * 9000).toString();
        console.log("Client not found, generated code:", clientCode);
    }
    
    console.log("Final clientCode:", clientCode);
}

testLongName().catch(console.error);
