import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Halftone to G-Code Converter | CNC Image Processing Tool",
  description: "Convert images to CNC-ready G-code using advanced halftone algorithms. Support for drilling and engraving patterns with multiple machine types including GRBL, Marlin, and LinuxCNC.",
  keywords: [
    "halftone",
    "g-code",
    "cnc",
    "image processing", 
    "dithering",
    "engraving",
    "drilling",
    "grbl",
    "marlin",
    "linuxcnc",
    "floyd-steinberg",
    "ordered dithering",
    "image to gcode"
  ],
  authors: [{ name: "Halftone to G-Code Converter" }],
  creator: "Claude Code Assistant",
  publisher: "Halftone to G-Code Converter",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://halftone-gcode.vercel.app'), // Replace with your actual domain
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Halftone to G-Code Converter",
    description: "Convert images to CNC-ready G-code using advanced halftone algorithms",
    url: 'https://halftone-gcode.vercel.app', // Replace with your actual domain
    siteName: 'Halftone to G-Code Converter',
    images: [
      {
        url: '/og-image.png', // You'll need to create this image
        width: 1200,
        height: 630,
        alt: 'Halftone to G-Code Converter Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Halftone to G-Code Converter',
    description: 'Convert images to CNC-ready G-code using advanced halftone algorithms',
    images: ['/og-image.png'], // You'll need to create this image
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes if needed
    // google: 'verification-code',
    // bing: 'verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
