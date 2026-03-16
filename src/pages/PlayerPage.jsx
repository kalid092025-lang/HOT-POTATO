import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { useGameState } from "../hooks/useGameState.js";
import { usePlayers } from "../hooks/usePlayers.js";
import { joinGame, submitPlayerAction } from "../game/gameController.js";
import Lobby from "../components/Lobby.jsx";
import TaskCard from "../components/TaskCard.jsx";
import Scoreboard from "../components/Scoreboard.jsx";

export default function PlayerPage() {
  const { gameState, loading, user } = useGameState();
  const { players } = usePlayers();
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const playerId = user?.uid;
  const player = useMemo(() => {
    if (!playerId) return null;
    return players.find((p) => p.id === playerId);
  }, [players, playerId]);

  const isHolder = player && player.id === gameState?.bombHolderId;

  const join = async () => {
    setError("");
    if (!name.trim() || !playerId) return;
    setJoining(true);
    try {
      await joinGame(name, playerId);
    } catch (err) {
      setError(err.message ?? "Could not join.");
    } finally {
      setJoining(false);
    }
  };

  if (loading || !gameState) {
    return (
      <div className="app-shell">
        <h1 className="title">Hot Potato: Chaos Mode</h1>
        <p className="subtitle">Loading the arena...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="title">Hot Potato: Chaos Mode</h1>
        <p className="subtitle">Player Console</p>
      </motion.div>

      {!player && (
        <div className="card">
          <h2 className="title">Join The Chaos</h2>
          <p className="subtitle">Enter your name to jump in.</p>
          <input
            className="task-input"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={16}
          />
          {error && <p className="subtitle">{error}</p>}
          <button className="button" onClick={join} disabled={joining}>
            {joining ? "Joining..." : "Join Game"}
          </button>
        </div>
      )}

      {player && (
        <>
          <div className="grid two">
            <div className="card">
              <h2 className="title">You</h2>
              <p
                className="subtitle"
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                {player.avatar?.startsWith("http") ? (
                  <img src={player.avatar} alt={player.name} width="28" height="28" />
                ) : (
                  player.avatar
                )}
                <span>{player.name} - {player.alive ? "Alive" : "Ghost"}</span>
              </p>
              <div className="tag" style={{ marginTop: "12px" }}>
                Phase: {gameState.phase}
              </div>
            </div>
            <div className="card">
              <h2 className="title">Invite</h2>
              <p className="subtitle">Scan to join at /play</p>
              <div className="qr">
                <QRCodeCanvas
                  value={`${window.location.origin}/play?game=default&k=${gameState.qrNonce ?? ""}`}
                  size={140}
                />
              </div>
            </div>
          </div>

          {gameState.phase === "lobby" && (
            <>
              <Lobby players={players} bombHolderId={gameState.bombHolderId} />
              <Scoreboard
                players={players}
                bombHolderId={gameState.bombHolderId}
              />
            </>
          )}

          {gameState.phase !== "lobby" && (
            <div className="grid two">
              {isHolder ? (
                <TaskCard
                  task={gameState.currentTask}
                  players={players.filter((p) => p.alive && p.id !== player.id)}
                  onComplete={(targetId) =>
                    submitPlayerAction(player.id, {
                      type: "complete",
                      targetId: targetId ?? null
                    })
                  }
                />
              ) : (
                <div className="card">
                  <h2 className="title">Wait For It</h2>
                  <p className="subtitle">
                    {gameState.bombHolderId
                      ? "Another player has the bomb."
                      : "The bomb is about to drop."}
                  </p>
                </div>
              )}
              <div>
                <Lobby players={players} bombHolderId={gameState.bombHolderId} />
                <div style={{ marginTop: "16px" }}>
                  <Scoreboard
                    players={players}
                    bombHolderId={gameState.bombHolderId}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
