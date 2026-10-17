import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgAYVeVccHHzI0uNNIoPHVMfXdCuZ6xLI",
  authDomain: "saydalaty.firebaseapp.com",
  projectId: "saydalaty",
  storageBucket: "saydalaty.firebasestorage.app",
  messagingSenderId: "326932832430",
  appId: "1:326932832430:web:e3d089532bff8b964d4d3f",
  measurementId: "G-D0HPXE06VX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const cloudDB = getFirestore(app);
