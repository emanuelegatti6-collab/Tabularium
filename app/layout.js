import "./globals.css";

export const metadata = {
  title: "Familiar — Estrattore di Codex",
  description: "La memoria di campagna per Dungeon Master",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
