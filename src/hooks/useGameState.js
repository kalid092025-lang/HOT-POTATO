import { useEffect, useState } from "react";
import { ensureGameDoc, subscribeGameState } from "../game/gameController.js";
import { useAuth } from "./useAuth.js";

export function useGameState() {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let unsub = () => {};
    ensureGameDoc().then(() => {
      unsub = subscribeGameState((data) => {
        setGameState(data);
        setLoading(false);
      });
    });
    return () => unsub();
  }, [user?.uid]);

  return { gameState, loading, user };
}
