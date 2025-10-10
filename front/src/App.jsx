import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/home";
import Login from "./pages/login";
import Draft from "./pages/draft";
import Ranking from "./pages/ranking";
import Team from "./pages/team";
import Market from "./pages/market";
import Register from "./pages/register";
import League from "./pages/league"; // 👈 nuevo
import { me, logout } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  useEffect(() => {
    me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoadingMe(false));
  }, []);

  const onLogout = async () => {
    await logout();
    setUser(null);
  };

  if (loadingMe) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home user={user} onLogout={onLogout} />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login onLogged={setUser} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" /> : <Register onRegistered={setUser} />}
        />
        <Route path="/league/:leagueId" element={<League />} />
        <Route path="/draft/:draftId" element={<Draft />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/team" element={<Team />} />
        <Route path="/market" element={<Market />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
