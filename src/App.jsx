import { Navigate, Route, Routes } from "react-router-dom";
import PlayerPage from "./pages/PlayerPage.jsx";
import ScreenPage from "./pages/ScreenPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/screen" replace />} />
      <Route path="/play" element={<PlayerPage />} />
      <Route path="/screen" element={<ScreenPage />} />
      <Route path="*" element={<Navigate to="/screen" replace />} />
    </Routes>
  );
}
