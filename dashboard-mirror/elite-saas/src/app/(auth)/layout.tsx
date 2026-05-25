export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Google Fonts: DM Serif Display (editorial serif) + DM Mono (body/ui) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
