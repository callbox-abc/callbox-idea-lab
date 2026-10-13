export const metadata = {
  title: "Callbox Idea Lab",
  description: "AI-powered content suite for Callbox Inc.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
