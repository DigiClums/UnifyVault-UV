import { mockContestTiers } from '../../../../lib/fantasy/mockData';
import ContestDetailClient from './ContestDetailClient';

export function generateStaticParams() {
  return mockContestTiers.map((contest) => ({
    id: contest.id,
  }));
}

export default async function ContestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ContestDetailClient contestId={resolvedParams.id} />;
}
