export function MeshBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute -left-[20%] top-[-15%] h-[55%] w-[55%] rounded-full opacity-[0.05] blur-[100px]"
        style={{
          background:
            "radial-gradient(ellipse at center, #6c63ff 0%, transparent 68%)",
        }}
      />
      <div
        className="absolute -right-[15%] top-[25%] h-[45%] w-[50%] rounded-full opacity-[0.05] blur-[100px]"
        style={{
          background:
            "radial-gradient(ellipse at center, #00d4a8 0%, transparent 68%)",
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[30%] h-[40%] w-[45%] rounded-full opacity-[0.04] blur-[90px]"
        style={{
          background:
            "radial-gradient(ellipse at center, #6c63ff 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
