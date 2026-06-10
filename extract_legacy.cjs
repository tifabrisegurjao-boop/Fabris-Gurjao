
const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin with the Service Account
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully.");
} catch (error) {
    console.error("Error initializing Firebase Admin:", error.message);
    process.exit(1);
}

const db = admin.firestore();

async function exportData() {
    console.log("Starting full database export (Admin Privilege)...");

    // List of collections to try exporting
    const collectionsToCheck = ['clients', 'contracts', 'cases', 'legal_structure', 'users'];
    let allData = [];

    for (const colName of collectionsToCheck) {
        try {
            console.log(`Reading collection: ${colName}...`);
            const snapshot = await db.collection(colName).get();

            if (snapshot.empty) {
                console.log(`  - [Empty] No documents in ${colName}`);
                continue;
            }

            console.log(`  - [Success] Found ${snapshot.size} documents.`);
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Fix timestamps (Firestore Timestamps to Date/String)
                const sanitizedData = {};
                for (const [key, value] of Object.entries(data)) {
                    if (value && typeof value === 'object' && '_seconds' in value) {
                        sanitizedData[key] = new Date(value._seconds * 1000).toISOString();
                    } else {
                        sanitizedData[key] = value;
                    }
                }

                allData.push({
                    _collection: colName,
                    id: doc.id,
                    ...sanitizedData
                });
            });
        } catch (error) {
            console.error(`  - [Error] Failed to read ${colName}:`, error.message);
        }
    }

    if (allData.length > 0) {
        fs.writeFileSync('legacy_backup.json', JSON.stringify(allData, null, 2));
        console.log(`\n✅ EXPORT COMPLETE! Saved ${allData.length} records to 'legacy_backup.json'.`);
    } else {
        console.log("\n⚠️  No data found in the common collections.");
    }
}

exportData();
