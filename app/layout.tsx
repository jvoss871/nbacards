import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import { CreditsProvider } from '@/lib/credits-context'
import { AuthGuard } from '@/components/AuthGuard'
export const metadata: Metadata = {
  title: 'CardPicks: NBA Prediction Game',
  description: 'Predict NBA games, earn credits, open card packs.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" style={{ backgroundColor: '#f0ede8' }}>
      <body className="min-h-full flex flex-col text-[#1a1714]" style={{ backgroundColor: '#f0ede8' }}>
        <CreditsProvider>
          <Nav />
          <AuthGuard>
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
              {children}
            </main>
          </AuthGuard>
        </CreditsProvider>
      </body>
    </html>
  )
}
