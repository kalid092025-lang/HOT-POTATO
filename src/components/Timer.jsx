import { motion } from "framer-motion";

export default function Timer({ value }) {
  return (
    <motion.div
      className="timer"
      animate={{ scale: value <= 5 ? [1, 1.1, 1] : 1 }}
      transition={{ repeat: value <= 5 ? Infinity : 0, duration: 0.8 }}
    >
      {value}s
    </motion.div>
  );
}
