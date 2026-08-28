export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 8,
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: 32, fontWeight: 600 }}>
        Caderno
      </div>
      <div style={{ fontSize: 13, color: "#5B675F" }}>
        Scaffold pronto — a interface entra na fase 3.
      </div>
    </div>
  );
}
