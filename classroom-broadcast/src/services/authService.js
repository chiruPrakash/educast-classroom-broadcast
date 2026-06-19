// Authentication Service
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const loginUser = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const logoutUser = () => signOut(auth);

export const getUserRole = async (uid) => {
  const adminDoc = await getDoc(doc(db, 'admins', uid));
  if (adminDoc.exists()) return 'admin';
  const lecturerDoc = await getDoc(doc(db, 'lecturers', uid));
  if (lecturerDoc.exists()) return 'lecturer';
  return 'viewer';
};

export const createAdminAccount = async (email, password, name) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'admins', credential.user.uid), {
    email, name, role: 'admin', createdAt: new Date()
  });
  return credential.user;
};

export const createLecturerAccount = async (email, password, name) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'lecturers', credential.user.uid), {
    email, name, role: 'lecturer', createdAt: new Date()
  });
  return credential.user;
};

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
