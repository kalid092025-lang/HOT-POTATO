import { useEffect, useState } from "react";
import { subscribePlayers } from "../game/gameController.js";

export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribePlayers((list) => {
      setPlayers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { players, loading };
}
