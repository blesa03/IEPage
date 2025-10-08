import { Link } from "react-router-dom";

export default function Home({ user, onLogout }) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-900 to-slate-950">

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Inazuma Eleven: <span className="text-cyan-400">La liguilla</span>
          </h1>
         

          <div className="mt-8 flex flex-wrap gap-3">
            {!user ? (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-cyan-400 text-black shadow hover:opacity-90 transition"
              >
                Iniciar sesión
              </Link>
            ) : (
              <>
                <span className="px-4 py-3 rounded-xl bg-white/10 border border-white/10">
                  Hola, <b>{user.username}</b>
                </span>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-red-500 text-white shadow hover:opacity-90 transition"
                >
                  Cerrar sesión
                </button>
              </>
            )}

           
          </div>
        </div>

        {/* Banner */}
        <div className="relative">
          <div className="aspect-[16/10] w-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-lg">
            <img
              src="https://wallpapers.com/images/hd/inazuma-eleven-team-group-shot-xv11xpcg61x3dq0j.jpg"
              alt="Chrono Stone"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Secciones */}
      <section
        id="secciones"
        className="mx-auto max-w-5xl px-6 pb-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {[
          { t: "Draft", d: "Personajes del draft" },
          { t: "Ejemplo", d: "EjemploEjemploEjemploEjemploEjemplo" },
          { t: "Ejemplo", d: "EjemploEjemploEjemploEjemploEjemplo" },

        ].map((c) => (
          <article
            key={c.t}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition"
          >
            <h3 className="text-xl font-bold">{c.t}</h3>
            <p className="text-white/80 mt-1">{c.d}</p>
            <button className="mt-4 text-cyan-300 hover:text-cyan-200 underline underline-offset-4">
              Abrir
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
