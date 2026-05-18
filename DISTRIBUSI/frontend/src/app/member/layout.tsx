export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-cyan-500/30">
      <div className="max-w-md mx-auto bg-gray-950 min-h-screen shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-full h-64 bg-cyan-900/20 blur-3xl pointer-events-none -translate-y-1/2"></div>
        {children}
      </div>
    </div>
  );
}
