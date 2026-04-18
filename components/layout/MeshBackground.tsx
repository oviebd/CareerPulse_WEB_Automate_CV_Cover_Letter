export function MeshBackground() {
  return (
    <div
      className="mesh-bg pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="mesh-bg-blob mesh-bg-blob-a absolute -left-[20%] top-[-15%] h-[55%] w-[55%] rounded-full blur-[100px]"
        style={{
          background: 'radial-gradient(ellipse at center, var(--primary) 0%, transparent 68%)',
        }}
      />
      <div
        className="mesh-bg-blob mesh-bg-blob-b absolute -right-[15%] top-[25%] h-[45%] w-[50%] rounded-full blur-[100px]"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--color-accent-mint) 0%, transparent 68%)',
        }}
      />
      <div
        className="mesh-bg-blob mesh-bg-blob-c absolute bottom-[-10%] left-[30%] h-[40%] w-[45%] rounded-full blur-[90px]"
        style={{
          background: 'radial-gradient(ellipse at center, var(--primary-deep) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
