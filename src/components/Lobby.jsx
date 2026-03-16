import PlayerAvatar from "./PlayerAvatar.jsx";

export default function Lobby({ players, bombHolderId }) {
  return (
    <div className="card">
      <h2 className="title">Lobby</h2>
      <p className="subtitle">Players ready: {players.length}</p>
      <div className="grid three" style={{ marginTop: "16px" }}>
        {players.map((player) => (
          <PlayerAvatar
            key={player.id}
            player={player}
            isHolder={player.id === bombHolderId}
          />
        ))}
      </div>
    </div>
  );
}
