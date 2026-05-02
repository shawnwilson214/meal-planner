import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDms_6ZzLw2HNud4MkkHvRO8K0yOuFmzo8",
  authDomain: "meal-planner-5452b.firebaseapp.com",
  projectId: "meal-planner-5452b",
  storageBucket: "meal-planner-5452b.firebasestorage.app",
  messagingSenderId: "917629812611",
  appId: "1:917629812611:web:d77b2d27958564aa1f00b6",
  measurementId: "G-86QTWPLLTJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);