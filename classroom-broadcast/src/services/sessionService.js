// ============================================================
// src/services/sessionService.js
// Session Management & Classroom Registry
//
// Firebase Firestore is used ONLY for:
//   - Session CRUD (create, list, start, end)
//   - Classroom registry (which rooms are watching)
//
// All WebRTC signalling has been removed — media is now
// handled entirely by LiveKit (see livekitService.js).
// ============================================================

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, onSnapshot, query, orderBy,
  where, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Session CRUD ──────────────────────────────────────────────

export const createSession = async ({ title, description, createdBy }) => {
  const ref = await addDoc(collection(db, 'sessions'), {
    title,
    description,
    status: 'idle',
    createdBy,
    createdAt: serverTimestamp(),
    startedAt: null,
    endedAt: null,
    viewerCount: 0,
  });
  return ref.id;
};

export const startSession = async (sessionId) => {
  await updateDoc(doc(db, 'sessions', sessionId), {
    status: 'live',
    startedAt: serverTimestamp(),
  });
};

export const endSession = async (sessionId) => {
  await updateDoc(doc(db, 'sessions', sessionId), {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
};

export const getSession = async (sessionId) => {
  const snap = await getDoc(doc(db, 'sessions', sessionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getAllSessions = async () => {
  const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const subscribeToSession = (sessionId, callback) =>
  onSnapshot(doc(db, 'sessions', sessionId), snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });

export const subscribeToSessions = (callback) => {
  const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeToLiveSessions = (callback) => {
  const q = query(
    collection(db, 'sessions'),
    where('status', '==', 'live'),
    orderBy('startedAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// ── LiveKit room name helper ──────────────────────────────────

/**
 * Returns a stable LiveKit room name for a given Firestore session ID.
 * Using the session ID directly ensures one LiveKit room per session.
 *
 * @param {string} sessionId — Firestore session document ID
 * @returns {string}         — LiveKit room name
 */
export const getLiveKitRoomName = (sessionId) => `educast_${sessionId}`;

// ── Classroom Registry ────────────────────────────────────────

export const registerClassroom = async (sessionId, classroomName) => {
  const ref = await addDoc(collection(db, 'classrooms'), {
    sessionId,
    name: classroomName,
    joinedAt: serverTimestamp(),
    status: 'watching',
  });
  return ref.id;
};

export const subscribeToClassrooms = (sessionId, callback) => {
  const q = query(
    collection(db, 'classrooms'),
    where('sessionId', '==', sessionId)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const removeClassroom = async (classroomId) => {
  await deleteDoc(doc(db, 'classrooms', classroomId));
};
