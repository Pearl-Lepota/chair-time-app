import './globals.css';

export const metadata = {
  title: 'Chair Time — Booking for salons',
  description: 'Booking software for nail, hair, braid, lash, and beauty salons.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
