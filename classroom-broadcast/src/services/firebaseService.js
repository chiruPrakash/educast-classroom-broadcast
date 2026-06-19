// ============================================================
// src/services/firebaseService.js
// All Firestore & Auth helper functions
// ============================================================

import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  onSnapshot, serverTimestamp, query, where, orderBy,
  deleteDoc, setDoc, Timestamp
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'firebase/auth';
import { db, auth } from '../firebase/config';

// ─── AUTH ────────────────────────────────────────────────────

export const loginAdmin = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutAdmin = () => signOut(auth);

export const onAuthChange = (callback) =>
  onAuthStateChanged(auth, callback);

// Check if the logged-in user is registered as an admin
export const isAdminUser = async (uid) => {
  try {
    const docRef = doc(db, 'admins', uid);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch { return false; }
};

// ─── SESSIONS ────────────────────────────────────────────────

/** Create a new session document */
export const createSession = async ({ title, description, adminId }) => {
  const ref = await addDoc(collection(db, 'sessions'), {
    title,
    description,
    status: 'scheduled',   // scheduled | live | ended
    adminId,
    lecturerId: null,
    viewerCount: 0,
    createdAt: serverTimestamp(),
    startedAt: null,
    endedAt: null,
  });
  return ref.id;
};

/** Mark session as live */
export const startSession = async (sessionId, lecturerId) => {
  await updateDoc(doc(db, 'sessions', sessionId), {
    status: 'live',
    lecturerId,
    startedAt: serverTimestamp(),
  });
};

/** Mark session as ended */
export const endSession = async (sessionId) => {
  await updateDoc(doc(db, 'sessions', sessionId), {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
  // Clean up WebRTC signaling subcollections
  await cleanupSignaling(sessionId);
};

/** Get a single session */
export const getSession = async (sessionId) => {
  const snap = await getDoc(doc(db, 'sessions', sessionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/** Listen to all sessions in real time */
export const subscribeToSessions = (callback) => {
  const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(sessions);
  });
};

/** Listen to live sessions only */
export const subscribeToLiveSessions = (callback) => {
  const q = query(
    collection(db, 'sessions'),
    where('status', '==', 'live'),
    orderBy('startedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

/** Listen to a single session */
export const subscribeToSession = (sessionId, callback) =>
  onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });

/** Update viewer count */
export const updateViewerCount = async (sessionId, delta) => {
  const ref = doc(db, 'sessions', sessionId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const current = snap.data().viewerCount || 0;
    await updateDoc(ref, { viewerCount: Math.max(0, current + delta) });
  }
};

// ─── CLASSROOMS ───────────────────────────────────────────────

/** Register or update a classroom viewer */
export const registerClassroom = async (name) => {
  const ref = await addDoc(collection(db, 'classrooms'), {
    name,
    status: 'idle',     // idle | watching
    sessionId: null,
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  });
  return ref.id;
};

/** Update classroom status */
export const updateClassroomStatus = async (classroomId, data) => {
  await updateDoc(doc(db, 'classrooms', classroomId), {
    ...data,
    lastSeen: serverTimestamp(),
  });
};

/** Remove a classroom entry */
export const removeClassroom = async (classroomId) => {
  await deleteDoc(doc(db, 'classrooms', classroomId));
};

/** Listen to all classrooms */
export const subscribeToClassrooms = (callback) => {
  const q = query(collection(db, 'classrooms'), orderBy('joinedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ─── WEBRTC SIGNALING ────────────────────────────────────────

/** Store lecturer's SDP offer for a session */
export const storeOffer = async (sessionId, offer) => {
  await setDoc(doc(db, 'sessions', sessionId, 'signaling', 'offer'), {
    sdp: offer.sdp,
    type: offer.type,
    createdAt: serverTimestamp(),
  });
};

/** Get the current offer */
export const getOffer = async (sessionId) => {
  const snap = await getDoc(doc(db, 'sessions', sessionId, 'signaling', 'offer'));
  return snap.exists() ? snap.data() : null;
};

/** Listen for offer updates */
export const subscribeToOffer = (sessionId, callback) =>
  onSnapshot(doc(db, 'sessions', sessionId, 'signaling', 'offer'), (snap) => {
    if (snap.exists()) callback(snap.data());
  });

/** Store viewer's SDP answer */
export const storeAnswer = async (sessionId, viewerId, answer) => {
  await setDoc(doc(db, 'sessions', sessionId, 'answers', viewerId), {
    sdp: answer.sdp,
    type: answer.type,
    createdAt: serverTimestamp(),
  });
};

/** Listen for a specific viewer's answer */
export const subscribeToAnswer = (sessionId, viewerId, callback) =>
  onSnapshot(doc(db, 'sessions', sessionId, 'answers', viewerId), (snap) => {
    if (snap.exists()) callback(snap.data());
  });

/** Add ICE candidate (lecturer → collection keyed by role) */
export const addIceCandidate = async (sessionId, role, viewerId, candidate) => {
  const path = role === 'lecturer'
    ? doc(db, 'sessions', sessionId, 'lecturerCandidates', `${Date.now()}_${Math.random().toString(36).slice(2)}`)
    : doc(db, 'sessions', sessionId, 'viewerCandidates', `${viewerId}_${Date.now()}`);
  await setDoc(path, { ...candidate, viewerId: viewerId || null });
};

/** Subscribe to remote ICE candidates */
export const subscribeToIceCandidates = (sessionId, role, viewerId, callback) => {
  // Viewers listen to lecturer's candidates; lecturer listens per-viewer
  const colName = role === 'viewer' ? 'lecturerCandidates' : 'viewerCandidates';
  const col = collection(db, 'sessions', sessionId, colName);
  return onSnapshot(col, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        const data = change.doc.data();
        // For lecturer, filter by viewerId
        if (role === 'lecturer' && data.viewerId !== viewerId) return;
        callback(data);
      }
    });
  });
};

/** Clean up signaling data after session ends */
const cleanupSignaling = async (sessionId) => {
  try {
    await deleteDoc(doc(db, 'sessions', sessionId, 'signaling', 'offer'));
  } catch (e) { /* ignore */ }
};
