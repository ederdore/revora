import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import '../../../styles/tokens.css'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Revora — Inteligência Comercial',
    template: '%s | Revora',
  },
  description: 'A plataforma de inteligência comercial que transforma dados em decisões.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={manrope.variable}>
      <body>{children}</body>
    </html>
  )
}
