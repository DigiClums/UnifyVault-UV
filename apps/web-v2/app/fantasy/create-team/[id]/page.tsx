import React, { Suspense } from 'react';
import { mockMatches } from '../../../../lib/fantasy/mockData';
import CreateTeamClient from './CreateTeamClient';

export function generateStaticParams() {
  return mockMatches.map((match) => ({
    id: match.id,
  }));
}

export default async function CreateTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">Loading team builder...</div>
      }
    >
      <CreateTeamClient matchId={resolvedParams.id} />
    </Suspense>
  );
}
