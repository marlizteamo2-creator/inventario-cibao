import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventario Cibao",
  description: "Sistema de inventario para Electro Cibao"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
