import type { Metadata } from 'next'
import DiscoverLanding from '@/components/discover/DiscoverLanding'

export const metadata: Metadata = {
  title: 'Revora Discover — Encontre as melhores oportunidades comerciais',
  description:
    'O Revora Discover analisa, classifica e prioriza automaticamente as melhores oportunidades comerciais para que a sua equipa foque onde importa.',
}

export default function DiscoverPage() {
  return <DiscoverLanding />
}
