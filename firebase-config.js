// firebase-config.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCaM7TUs8rxFFDEMgmAx2DG7XllBthnoAA",
  authDomain: "barisal-polytechnic-inst-54ce1.firebaseapp.com",
  projectId: "barisal-polytechnic-inst-54ce1",
  storageBucket: "barisal-polytechnic-inst-54ce1.firebasestorage.app",
  messagingSenderId: "752245058284",
  appId: "1:752245058284:web:2158243d737a83fc0953c9",
  measurementId: "G-5TNPK05BED"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut };