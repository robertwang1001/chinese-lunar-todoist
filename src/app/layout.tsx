import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chinese Lunar Todoist',
  description: 'Turn Chinese lunar dates into clear, ready-to-use Todoist tasks.',
  icons: {
    icon: '/favicon.png?v=2',
    apple: '/chinese-lunar-todoist-logo.png',
  },
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {`try{const t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch{}`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
