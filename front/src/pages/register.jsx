import { useState } from "react";
import { register, me } from "../api";

export default function Register({ onRegistered }) {
  const [form, setForm] = useState({ username: "", password: "", role: "player" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await register(form.username, form.password, form.role);
      const data = await me();
      onRegistered?.(data);
    } catch (e) {
      setErr(e?.response?.data?.error || "No se pudo registrar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <form onSubmit={submit} className="w-full max-w-sm p-6 rounded-xl border border-white/10 bg-white/5">
        <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>
        <input
          className="w-full px-3 py-2 mb-2 rounded-lg bg-slate-900 border border-white/10 outline-none"
          placeholder="Usuario"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          className="w-full px-3 py-2 mb-2 rounded-lg bg-slate-900 border border-white/10 outline-none"
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="w-full rounded-lg px-4 py-2 font-semibold bg-cyan-400 text-black hover:opacity-90">
          Registrarme
        </button>
        {err && <div className="mt-2 text-red-400">{err}</div>}
      </form>
    </div>
  );
}
