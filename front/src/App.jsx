import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/home";
import Login from "./pages/login";
import Draft from "./pages/draft";
import Ranking from "./pages/ranking";
import Team from "./pages/team";
import Market from "./pages/market";
import { me, logout } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  useEffect(() => {
    me().then(setUser).catch(() => setUser(null)).finally(() => setLoadingMe(false));
  }, []);

  const onLogout = async () => {
    await logout();
    setUser(null);
  };

  if (loadingMe) return <div className="p-6">Cargando…</div>;

  return (
    <BrowserRouter>
      <nav className="h-16 flex items-center gap-4 px-6 border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <Link to="/" className="font-semibold tracking-tight">Inazuma Eleven</Link>
        <div className="ml-auto flex items-center gap-3">
          {!user ? (
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition"
            >
              Login
            </Link>
          ) : (
            <>
              <span className="text-white/80">Hola, <b>{user.username}</b></span>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg bg-red-500 hover:opacity-90 transition"
              >
                Salir
              </button>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home user={user} onLogout={onLogout} />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogged={setUser} />} />
        <Route path="/draft" element={<Draft />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/team" element={<Team />} />
        <Route path="/market" element={<Market />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
