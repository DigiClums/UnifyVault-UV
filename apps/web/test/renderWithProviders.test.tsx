import React from 'react';
import { describe, it, expect } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { renderWithProviders, screen } from './utils';

function SampleQueryComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['testKey'],
    queryFn: async () => 'UnifyVault Test Data',
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>Data: {data}</div>;
}

describe('renderWithProviders utility', () => {
  it('renders components with QueryClientProvider successfully', async () => {
    renderWithProviders(<SampleQueryComponent />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(await screen.findByText('Data: UnifyVault Test Data')).toBeInTheDocument();
  });
});
