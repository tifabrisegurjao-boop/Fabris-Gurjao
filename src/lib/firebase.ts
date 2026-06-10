
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCQ865fjOiTRGbogtvI6leNSBF-n2uCwx0",
    authDomain: "pagamento-5b5c1.firebaseapp.com",
    projectId: "pagamento-5b5c1",
    storageBucket: "pagamento-5b5c1.firebasestorage.app",
    messagingSenderId: "748472701350",
    appId: "1:748472701350:web:2b8d65bb261bbd94f17f67"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
