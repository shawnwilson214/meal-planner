import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

 

const firebaseConfig = {

  apiKey: "AIzaSyDjkEaYsDp3pkgJaSw3TBwBDQAacVCSgIA",

  authDomain: "meal-planner-c2811.firebaseapp.com",

  projectId: "meal-planner-c2811",

  storageBucket: "meal-planner-c2811.firebasestorage.app",

  messagingSenderId: "80674989133",

  appId: "1:80674989133:web:9fed7bb9b3b568994ce804"

};

 

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);