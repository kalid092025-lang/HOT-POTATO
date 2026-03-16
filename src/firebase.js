import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDW7fJ2VuplVS9QVD60FPrnv62aGxNAoaE",
  authDomain: "hot-potatoes-ce605.firebaseapp.com",
  projectId: "hot-potatoes-ce605",
  storageBucket: "hot-potatoes-ce605.firebasestorage.app",
  messagingSenderId: "983653205027",
  appId: "1:983653205027:web:26eef5eaa8b1535142dd96"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
