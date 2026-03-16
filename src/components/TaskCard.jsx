import { useMemo, useState } from "react";

export default function TaskCard({ task, onComplete, players }) {
  const [tapCount, setTapCount] = useState(0);
  const [answer, setAnswer] = useState("");
  const [typed, setTyped] = useState("");

  const choiceOptions = useMemo(() => {
    if (task?.type !== "choose") return [];
    return task.options ?? players ?? [];
  }, [task, players]);

  if (!task) return null;

  return (
    <div className="card">
      <h2 className="title">{task.title}</h2>
      <p className="subtitle">{task.prompt}</p>

      {task.type === "tap" && (
        <div style={{ marginTop: "16px" }}>
          <p className="tag">Taps: {tapCount}/{task.target}</p>
          <button
            className="button"
            style={{ marginTop: "12px" }}
            onClick={() => {
              const next = tapCount + 1;
              setTapCount(next);
              if (next >= task.target) onComplete();
            }}
          >
            Tap!
          </button>
        </div>
      )}

      {task.type === "math" && (
        <div style={{ marginTop: "16px" }}>
          <input
            className="task-input"
            placeholder="Answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
          <button
            className="button"
            style={{ marginTop: "12px" }}
            onClick={() => {
              if (answer.trim() === task.answer) onComplete();
            }}
          >
            Submit
          </button>
        </div>
      )}

      {task.type === "type" && (
        <div style={{ marginTop: "16px" }}>
          <input
            className="task-input"
            placeholder="Type here"
            value={typed}
            onChange={(event) => {
              const value = event.target.value;
              setTyped(value);
              if (value.trim().toLowerCase() === task.word) onComplete();
            }}
          />
        </div>
      )}

      {task.type === "choose" && (
        <div className="grid two" style={{ marginTop: "16px" }}>
          {choiceOptions.map((player) => (
            <button
              key={player.id}
              className="button secondary"
              onClick={() => onComplete(player.id)}
            >
              {player.avatar?.startsWith("http") ? (
                <img src={player.avatar} alt={player.name} width="28" height="28" />
              ) : (
                player.avatar
              )}{" "}
              {player.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
