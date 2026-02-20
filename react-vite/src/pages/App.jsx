export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 text-center max-w-md">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4">
          Setup Complete!
        </h1>
        <p className="text-slate-300 text-lg mb-6">
          ยินดีด้วยครับ! Docker + React + Tailwind v4 ของคุณพร้อมใช้งานแล้ว 🚀
        </p>
        <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 cursor-pointer">
          Let's Code!
        </button>
      </div>
    </div>
  )
}