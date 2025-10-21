import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/home";
import Login from "./pages/login";
import Draft from "./pages/draft";
import Ranking from "./pages/ranking";
import Team from "./pages/team";
import Market from "./pages/market";
import Register from "./pages/register";
import League from "./pages/league";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import { me, logout } from "./api";

const ProtectedRoute = ({ user, children }) => {
  return user ? children : <Navigate to="/login" replace />;
};

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
        <Route
          path="/"
          element={
            <ProtectedRoute user={user}>
              <Home user={user} onLogout={onLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login onLogged={setUser} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" replace /> : <Register onRegistered={setUser} />}
        />

        <Route
          path="/league/:leagueId"
          element={
            <ProtectedRoute user={user}>
              <League />
            </ProtectedRoute>
          }
        />

        <Route
          path="/draft/:draftId"
          element={
            <ProtectedRoute user={user}>
              <Draft />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ranking/:leagueId"
          element={
            <ProtectedRoute user={user}>
              <Ranking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/games/league/:leagueId"
          element={
            <ProtectedRoute user={user}>
              <Matches />
            </ProtectedRoute>
          }
        />

        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute user={user}>
              <MatchDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/team/:draftId"
          element={
            <ProtectedRoute user={user}>
              <Team />
            </ProtectedRoute>
          }
        />

        <Route
          path="/market"
          element={
            <ProtectedRoute user={user}>
              <Market />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
