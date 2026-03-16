import { motion } from "framer-motion";

export default function PlayerAvatar({ player, isHolder }) {
  return (
    <motion.div
      className={`player-avatar ${isHolder ? "active" : ""}`}
      animate={{ scale: isHolder ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
    >
      <div className="avatar-emoji">
        {player.avatar?.startsWith("http") ? (
          <img src={player.avatar} alt={player.name} width="36" height="36" />
        ) : (
          player.avatar
        )}
      </div>
      <div className="player-meta">
        <strong>{player.name}</strong>
        <span className="tag">
          {player.alive ? "Alive" : "Ghost"}
        </span>
      </div>
    </motion.div>
  );
}
