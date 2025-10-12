import { useState } from "react";
import { Link } from "react-router-dom";
import { login, me } from "../api"; // Ya no necesitas llamar getCsrf explícitamente

export default function Login({ onLogged }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      // login ya llama getCsrf internamente
      await login(form.username, form.password);

      // obtener info del usuario autenticado
      const data = await me();
      onLogged(data);
    } catch (e) {
      setErr("Credenciales inválidas");
      console.error(e);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16 p-6 rounded-2xl border border-white/10 bg-white/5 text-white">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <input
          className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 outline-none focus:ring-2 focus:ring-cyan-400"
          placeholder="Usuario"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 outline-none focus:ring-2 focus:ring-cyan-400"
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button
          type="submit"
          className="mt-1 rounded-lg px-4 py-2 font-semibold bg-cyan-400 text-black hover:opacity-90"
        >
          Entrar
        </button>
        {err && <div className="text-red-400">{err}</div>}
      </form>

      <div className="mt-4 text-sm text-white/80">
        ¿No tienes cuenta?{" "}
        <Link
          to="/register"
          className="font-semibold text-cyan-300 hover:underline"
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
