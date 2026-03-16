import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { useGameState } from "../hooks/useGameState.js";
import { usePlayers } from "../hooks/usePlayers.js";
import {
  clearPlayerAction,
  claimHostLock,
  explodeBomb,
  heartbeatHost,
  passBomb,
  resetToLobby,
  regenerateQr,
  startGame,
  tickBomb,
  updateHostToken
} from "../game/gameController.js";
import Bomb from "../components/Bomb.jsx";
import Timer from "../components/Timer.jsx";
import Lobby from "../components/Lobby.jsx";
import GameFeed from "../components/GameFeed.jsx";
import PlayerAvatar from "../components/PlayerAvatar.jsx";
import Scoreboard from "../components/Scoreboard.jsx";
import { cardRise, screenEnter } from "../animations/variants.js";

export default function ScreenPage() {
  const { gameState, loading, user } = useGameState();
  const { players } = usePlayers();
  const explosionLock = useRef(false);
  const lastActionAtRef = useRef(0);
  const controllerTokenRef = useRef(
    localStorage.getItem("hot-potato-controller-token") || crypto.randomUUID()
  );

  useEffect(() => {
    localStorage.setItem("hot-potato-controller-token", controllerTokenRef.current);
    claimHostLock(controllerTokenRef.current, user?.uid);
    const interval = setInterval(() => {
      heartbeatHost(controllerTokenRef.current, user?.uid);
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  const isHost =
    gameState?.controllerToken === controllerTokenRef.current &&
    (gameState?.controllerExpiresAt ?? 0) > Date.now();
  const aliveCount = players.filter((p) => p.alive).length;
  const canStart = isHost && aliveCount >= 2 && gameState.phase === "lobby";

  useEffect(() => {
    if (!gameState || gameState.phase !== "playing" || !isHost) return;
    const interval = setInterval(() => {
      tickBomb(controllerTokenRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState?.phase, isHost]);

  useEffect(() => {
    if (!gameState || gameState.phase !== "playing" || !isHost) return;
    if (gameState.bombTimer > 0 || !gameState.bombHolderId) {
      explosionLock.current = false;
      return;
    }
    if (explosionLock.current) return;
    explosionLock.current = true;
    explodeBomb(controllerTokenRef.current).then(() => {
      if (aliveCount >= 3) passBomb(controllerTokenRef.current, undefined, "dropped");
    });
  }, [gameState?.bombTimer, gameState?.bombHolderId, gameState?.phase, isHost]);

  const holder = useMemo(() => {
    if (!gameState) return null;
    return players.find((p) => p.id === gameState.bombHolderId);
  }, [gameState, players]);

  const winner = useMemo(() => {
    if (!gameState) return null;
    const alive = players.filter((p) => p.alive);
    if (alive.length === 1) return alive[0];
    const sorted = [...players].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0)
    );
    return sorted[0] ?? null;
  }, [gameState, players]);

  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== "playing") return;
    if (!holder || !holder.action || !holder.actionAt) return;
    if (holder.action.type !== "complete") return;
    if (holder.actionAt <= lastActionAtRef.current) return;
    lastActionAtRef.current = holder.actionAt;

    const task = gameState.currentTask;
    if (!task) return;

    if (task.type === "choose") {
      const targetId = holder.action.targetId;
      const target = players.find((p) => p.id === targetId && p.alive);
      if (target) {
        passBomb(controllerTokenRef.current, targetId, "passed");
      }
    } else {
      passBomb(controllerTokenRef.current, undefined, "passed");
    }
    clearPlayerAction(holder.id);
  }, [isHost, gameState, holder, players]);

  if (loading || !gameState) {
    return (
      <div className="app-shell">
        <h1 className="title">Hot Potato: Chaos Mode</h1>
        <p className="subtitle">Warming up the stage...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <motion.div variants={screenEnter} initial="hidden" animate="show">
        <h1 className="title">Hot Potato: Chaos Mode</h1>
        <p className="subtitle">Big Screen</p>
      </motion.div>

      <div className="screen-layout">
        <motion.div variants={cardRise} initial="hidden" animate="show">
          <Lobby players={players} bombHolderId={gameState.bombHolderId} />
          <div style={{ marginTop: "16px" }}>
            <Scoreboard
              players={players}
              bombHolderId={gameState.bombHolderId}
            />
          </div>
          <div style={{ marginTop: "16px" }} className="card">
            <h2 className="title">Controls</h2>
            <p className="subtitle">Phase: {gameState.phase}</p>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button className="button" onClick={() => startGame(controllerTokenRef.current)} disabled={!canStart}>
                Start Game
              </button>
              <button className="button secondary" onClick={() => resetToLobby(controllerTokenRef.current)} disabled={!isHost}>
                Reset Lobby
              </button>
            </div>
            <p className="subtitle" style={{ marginTop: "12px" }}>
              Controller: {isHost ? "You are live" : "Another screen is controlling"}
            </p>
            {!isHost && (
              <p className="subtitle" style={{ marginTop: "8px" }}>
                Close other screen tabs to take control.
              </p>
            )}
            {isHost && aliveCount < 2 && (
              <p className="subtitle" style={{ marginTop: "8px" }}>
                Need at least 2 players to start.
              </p>
            )}
            <div style={{ marginTop: "12px" }}>
              <button
                className="button secondary"
                onClick={() => updateHostToken(controllerTokenRef.current)}
                disabled={!isHost}
              >
                Rotate Host Token
              </button>
            </div>
            <div style={{ marginTop: "16px" }}>
              <button
                className="button secondary"
                onClick={() => regenerateQr(controllerTokenRef.current)}
                disabled={!isHost}
              >
                Regenerate QR
              </button>
            </div>
            <div className="qr" style={{ marginTop: "16px" }}>
              <QRCodeCanvas
                value={`${window.location.origin}/play?game=default&k=${gameState.qrNonce ?? ""}`}
                size={140}
              />
            </div>
          </div>
        </motion.div>

        <div className="screen-right">
          <motion.div className="card" variants={cardRise} initial="hidden" animate="show">
            <h2 className="title">Bomb Stage</h2>
            <p className="subtitle">
              {holder ? `${holder.name} is holding the bomb.` : "No holder yet."}
            </p>
            <div className="bomb-stage">
              <Bomb isExploding={gameState.bombTimer === 0 && gameState.phase === "playing"} />
              <Timer value={gameState.bombTimer ?? 0} />
            </div>
            <div className="grid two" style={{ marginTop: "12px" }}>
              {players.map((player) => (
                <PlayerAvatar
                  key={player.id}
                  player={player}
                  isHolder={player.id === gameState.bombHolderId}
                />
              ))}
            </div>
          </motion.div>

          <motion.div variants={cardRise} initial="hidden" animate="show">
            <GameFeed feed={gameState.feed ?? []} />
          </motion.div>
        </div>
      </div>

      {gameState.phase === "gameover" && winner && (
        <motion.div
          className="winner-overlay"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="card winner-card">
            <h2 className="title">Winner!</h2>
            <p className="subtitle">{winner.name} owns the chaos.</p>
            <div className="winner-avatar">
              <img src={winner.avatar} alt={winner.name} width="120" height="120" />
            </div>
            <p className="subtitle">Score: {winner.score ?? 0}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
