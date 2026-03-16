import PlayerAvatar from "./PlayerAvatar.jsx";

export default function Scoreboard({ players, bombHolderId }) {
  const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return (
    <div className="card">
      <h2 className="title">Scoreboard</h2>
      <p className="subtitle">Survivors earn points when someone explodes.</p>
      <div className="grid three" style={{ marginTop: "16px" }}>
        {sorted.map((player) => (
          <div key={player.id}>
            <PlayerAvatar player={player} isHolder={player.id === bombHolderId} />
            <div className="tag" style={{ marginTop: "8px" }}>
              Score: {player.score ?? 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
