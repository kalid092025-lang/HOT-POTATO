import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "../firebase.js";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      if (current) {
        setUser(current);
        setLoading(false);
      } else {
        signInAnonymously(auth).catch(() => {
          setLoading(false);
        });
      }
    });
    return () => unsub();
  }, []);

  return { user, loading };
}
