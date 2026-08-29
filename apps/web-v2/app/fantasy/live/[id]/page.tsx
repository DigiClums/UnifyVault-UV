import { mockMatches } from '../../../../lib/fantasy/mockData';
import LiveMatchClient from './LiveMatchClient';

export function generateStaticParams() {
  return mockMatches.map((match) => ({
    id: match.id,
  }));
}

export default async function LiveMatchCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <LiveMatchClient matchId={resolvedParams.id} />;
}
