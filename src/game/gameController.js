import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase.js";
import { generateTask } from "./tasks.js";
import { getGhostAvatar, getRandomAvatar } from "./avatars.js";

const GAME_ID = "default";
const HOST_TTL_MS = 20000;
const PLAYER_TTL_MS = 30000;
const HOST_TOKEN = import.meta.env.VITE_HOST_TOKEN || "dev-host-token";

function gameRef() {
  return doc(db, "games", GAME_ID);
}

function playersRef() {
  return collection(db, "games", GAME_ID, "players");
}

function playerRef(playerId) {
  return doc(db, "games", GAME_ID, "players", playerId);
}

export function subscribeGameState(onChange) {
  return onSnapshot(gameRef(), (snap) => {
    onChange(snap.exists() ? snap.data() : null);
  });
}

export function subscribePlayers(onChange) {
  return onSnapshot(playersRef(), (snap) => {
    const list = snap.docs.map((docSnap) => docSnap.data());
    onChange(list);
  });
}

export async function ensureGameDoc() {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      phase: "lobby",
      bombHolderId: null,
      bombTimer: 0,
      currentTask: null,
      feed: [],
      hostToken: HOST_TOKEN,
      previousHostToken: null,
      hostUid: null,
      controllerToken: null,
      controllerExpiresAt: 0,
      controllerHeartbeatAt: 0,
      qrNonce: crypto.randomUUID(),
      joinToken: crypto.randomUUID(),
      updatedAt: serverTimestamp()
    });
    return;
  }

  const data = snap.data();
  if (!data.joinToken) {
    await updateDoc(ref, {
      joinToken: crypto.randomUUID(),
      qrNonce: crypto.randomUUID(),
      updatedAt: serverTimestamp()
    });
  }
}

export async function claimHostLock(controllerToken, hostUid) {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const now = Date.now();
  const expired =
    !data.controllerToken || (data.controllerExpiresAt ?? 0) < now;
  if (expired || data.controllerToken === controllerToken) {
    await updateDoc(ref, {
      controllerToken,
      controllerExpiresAt: now + HOST_TTL_MS,
      controllerHeartbeatAt: now,
      hostUid: hostUid ?? data.hostUid ?? null,
      updatedAt: serverTimestamp()
    });
  }
}

export async function updateHostToken(controllerToken) {
  await runTransaction(db, async (tx) => {
    const ref = gameRef();
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (!isHost(data, controllerToken)) return;
    const nextToken = crypto.randomUUID();
    tx.update(ref, {
      previousHostToken: data.hostToken ?? null,
      hostToken: nextToken,
      updatedAt: serverTimestamp()
    });
  });
}

export async function regenerateQr(hostToken) {
  await runTransaction(db, async (tx) => {
    const ref = gameRef();
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (!isHost(data, hostToken)) return;
    tx.update(ref, {
      qrNonce: crypto.randomUUID(),
      joinToken: crypto.randomUUID(),
      updatedAt: serverTimestamp()
    });
  });
}

export async function heartbeatHost(controllerToken, hostUid) {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.controllerToken !== controllerToken) return;
  const now = Date.now();
  await updateDoc(ref, {
    controllerExpiresAt: now + HOST_TTL_MS,
    controllerHeartbeatAt: now,
    hostUid: hostUid ?? data.hostUid ?? null,
    updatedAt: serverTimestamp()
  });
}

export async function joinGame(name, playerId, joinToken) {
  const safeName = name.trim();
  const player = {
    id: playerId,
    name: safeName,
    nameLower: safeName.toLowerCase(),
    avatar: getRandomAvatar(safeName),
    alive: true,
    isGhost: false,
    score: 0,
    action: null,
    actionAt: 0,
    lastSeenAt: Date.now(),
    createdAt: Date.now()
  };

  const playersSnap = await getDocs(playersRef());
  const players = playersSnap.docs.map((docSnap) => docSnap.data());
  if (players.some((p) => p.nameLower === player.nameLower)) {
    throw new Error("Name already taken.");
  }

  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      phase: "lobby",
      bombHolderId: null,
      bombTimer: 0,
      currentTask: null,
      feed: [],
      hostToken: HOST_TOKEN,
      previousHostToken: null,
      hostUid: null,
      controllerToken: null,
      controllerExpiresAt: 0,
      controllerHeartbeatAt: 0,
      qrNonce: crypto.randomUUID(),
      joinToken: crypto.randomUUID(),
      updatedAt: serverTimestamp()
    });
  }
  const latestSnap = await getDoc(ref);
  const latest = latestSnap.data();
  if (latest?.joinToken && latest.joinToken !== joinToken) {
    throw new Error("This lobby link is no longer valid.");
  }

  await setDoc(playerRef(playerId), player);
  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(ref);
    const data = gameSnap.data() ?? { feed: [] };
    tx.update(ref, {
      feed: [...(data.feed ?? []), `${player.name} joined the chaos.`].slice(-30),
      updatedAt: serverTimestamp()
    });
  });

  return playerId;
}

export async function submitPlayerAction(playerId, action) {
  await updateDoc(playerRef(playerId), {
    action,
    actionAt: Date.now()
  });
}

export async function clearPlayerAction(playerId) {
  await updateDoc(playerRef(playerId), {
    action: null
  });
}

export async function heartbeatPlayer(playerId) {
  try {
    await updateDoc(playerRef(playerId), {
      lastSeenAt: Date.now()
    });
  } catch (err) {
    // Ignore missing player docs after lobby reset.
  }
}

export async function pruneInactivePlayers(hostToken, maxAgeMs = PLAYER_TTL_MS) {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (!isHost(data, hostToken)) return;

  const playersSnap = await getDocs(playersRef());
  const cutoff = Date.now() - maxAgeMs;
  const batch = writeBatch(db);
  playersSnap.forEach((playerDoc) => {
    const player = playerDoc.data();
    if ((player.lastSeenAt ?? 0) < cutoff) {
      batch.delete(playerDoc.ref);
    }
  });
  await batch.commit();
}

export async function endGameIfSolo(hostToken) {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (!isHost(data, hostToken)) return;
  if (data.phase !== "playing") return;

  const playersSnap = await getDocs(playersRef());
  const players = playersSnap.docs.map((docSnap) => docSnap.data());
  const alivePlayers = players.filter((p) => p.alive);
  if (alivePlayers.length > 1) return;

  const winnerName = alivePlayers[0]?.name ?? "Someone";
  await updateDoc(ref, {
    phase: "gameover",
    bombHolderId: null,
    bombTimer: 0,
    currentTask: null,
    feed: [...(data.feed ?? []), `${winnerName} wins by default.`].slice(-30),
    updatedAt: serverTimestamp()
  });
}

function isHost(data, controllerToken) {
  return controllerToken && data.controllerToken === controllerToken;
}

export async function startGame(hostToken) {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (!isHost(data, hostToken)) return;
  const playersSnap = await getDocs(playersRef());
  const players = playersSnap.docs.map((docSnap) => docSnap.data());
  const alivePlayers = players.filter((p) => p.alive);
  if (alivePlayers.length < 2) return;
  const firstHolder =
    alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  const duration = getRandomTimer();
  const task = generateTask(alivePlayers);
  await updateDoc(ref, {
    phase: "playing",
    bombHolderId: firstHolder.id,
    bombTimer: duration,
    currentTask: task,
    feed: [...(data.feed ?? []), `${firstHolder.name} got the bomb.`].slice(-30),
    updatedAt: serverTimestamp()
  });
}

export async function tickBomb(hostToken) {
  await runTransaction(db, async (tx) => {
    const ref = gameRef();
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (!isHost(data, hostToken)) return;
    if (data.phase !== "playing") return;
    const nextTimer = Math.max((data.bombTimer ?? 0) - 1, 0);
    tx.update(ref, { bombTimer: nextTimer, updatedAt: serverTimestamp() });
  });
}

export async function passBomb(hostToken, nextHolderId, reason = "passed") {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (!isHost(data, hostToken)) return;
  const playersSnap = await getDocs(playersRef());
  const players = playersSnap.docs.map((docSnap) => docSnap.data());
  const alivePlayers = players.filter((p) => p.alive);
  if (alivePlayers.length < 2) return;

  const current = players.find((p) => p.id === data.bombHolderId);
  const candidate = players.find((p) => p.id === nextHolderId);
  const filtered = alivePlayers.filter((p) => p.id !== data.bombHolderId);
  const pool = filtered.length > 0 ? filtered : alivePlayers;
  const nextHolder =
    (candidate && candidate.alive && candidate.id !== data.bombHolderId ? candidate : null) ||
    pool[Math.floor(Math.random() * pool.length)];
  const duration = getRandomTimer();
  const task = generateTask(alivePlayers);
  await updateDoc(ref, {
    bombHolderId: nextHolder.id,
    bombTimer: duration,
    currentTask: task,
    feed: [
      ...(data.feed ?? []),
      `${current?.name ?? "Someone"} ${reason} to ${nextHolder.name}.`
    ].slice(-30),
    updatedAt: serverTimestamp()
  });
}

export async function explodeBomb(hostToken) {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (!isHost(data, hostToken)) return;
  const playersSnap = await getDocs(playersRef());
  const players = playersSnap.docs.map((docSnap) => ({
    ref: docSnap.ref,
    ...docSnap.data()
  }));
  const holder = players.find((p) => p.id === data.bombHolderId);
  if (!holder) return;

  const batch = writeBatch(db);
  players.forEach((player) => {
    if (player.id === holder.id) {
      batch.update(player.ref, {
        alive: false,
        isGhost: true,
        avatar: getGhostAvatar(player.name)
      });
    } else if (player.alive) {
      batch.update(player.ref, { score: (player.score ?? 0) + 1 });
    }
  });
  const aliveCount = players.filter((p) => p.id !== holder.id && p.alive).length;
  const nextPhase = aliveCount <= 1 ? "gameover" : aliveCount <= 2 ? "final" : "playing";
  batch.update(ref, {
    bombHolderId: null,
    bombTimer: 0,
    phase: nextPhase,
    currentTask: null,
    feed: [...(data.feed ?? []), `${holder.name} exploded!`].slice(-30),
    updatedAt: serverTimestamp()
  });
  await batch.commit();
}

export async function resetToLobby(hostToken) {
  const ref = gameRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  if (!isHost(data, hostToken)) return;

  const playersSnap = await getDocs(playersRef());
  const batch = writeBatch(db);
  playersSnap.forEach((playerDoc) => {
    batch.delete(playerDoc.ref);
  });
  batch.update(ref, {
    phase: "lobby",
    bombHolderId: null,
    bombTimer: 0,
    currentTask: null,
    feed: [],
    qrNonce: crypto.randomUUID(),
    joinToken: crypto.randomUUID(),
    updatedAt: serverTimestamp()
  });
  await batch.commit();
}

export function getRandomTimer() {
  return Math.floor(Math.random() * 16) + 15;
}
