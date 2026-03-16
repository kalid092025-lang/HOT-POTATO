import { motion } from "framer-motion";

export default function Bomb({ isExploding }) {
  return (
    <motion.div
      className="bomb-core"
      animate={
        isExploding
          ? { scale: [1, 1.15, 0.8], opacity: [1, 0.8, 0] }
          : { scale: [1, 1.05, 1] }
      }
      transition={{
        duration: isExploding ? 0.9 : 1.6,
        repeat: isExploding ? 0 : Infinity,
      }}
    >
      <motion.span
        animate={{ rotate: isExploding ? 0 : 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{ fontSize: "40px" }}
      >
        💣
      </motion.span>
    </motion.div>
  );
}
import { db } from "../firebase";

console.log(db);
