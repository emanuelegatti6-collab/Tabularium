import "./globals.css";

export const metadata = {
  title: "Tabolarium — La memoria della tua campagna",
  description: "La memoria di campagna per Dungeon Master",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
