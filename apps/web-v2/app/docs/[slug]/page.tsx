import { DOCS_DATA } from '../../../lib/docs/docsData';
import DocSlugClient from './DocSlugClient';

export function generateStaticParams() {
  const slugs: { slug: string }[] = [];
  for (const cat of DOCS_DATA) {
    for (const item of cat.items) {
      slugs.push({ slug: item.slug });
    }
  }
  return slugs;
}

export default async function DocSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <DocSlugClient slug={resolvedParams?.slug || 'introduction'} />;
}
