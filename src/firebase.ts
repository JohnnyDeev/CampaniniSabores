import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, where, onSnapshot, deleteDoc, getDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForCampaniniSabores",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "campanini-sabores.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "campanini-sabores",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "campanini-sabores.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { db, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, where, onSnapshot, deleteDoc, getDoc, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, storage, ref, uploadBytes, getDownloadURL, deleteObject, updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail };
