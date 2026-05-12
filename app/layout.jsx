// next/font loads the Figma-selected fonts through Next.js.
import { Epilogue, Manrope } from "next/font/google";
// Global CSS and Tailwind utilities are imported once at the root layout.
import "./globals.css";

// Manrope is used for small labels and supporting text in the Figma kitchen screen.
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-manrope-next"
});

// Epilogue is used for operational headings, table numbers, and action buttons.
const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-epilogue-next"
});

// Metadata appears in the browser tab and deployment previews.
export const metadata = {
  title: "Eddy Buffet Database Demo",
  description: "Role-based buffet restaurant database final project prototype"
};

// RootLayout wraps every page in the app.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${epilogue.variable}`}>
      <body>{children}</body>
    </html>
  );
}
