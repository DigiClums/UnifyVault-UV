import { mockMatches } from '../../../../lib/fantasy/mockData';
import MatchDetailClient from './MatchDetailClient';

export function generateStaticParams() {
  return mockMatches.map((match) => ({
    id: match.id,
  }));
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <MatchDetailClient matchId={resolvedParams.id} />;
}
