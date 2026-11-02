import {
  buildResultsMetadata,
  ResultsPage,
  type ResultsSearchParams,
} from "@/components/listings/ResultsPage";

type PageProps = {
  params: Promise<{ il: string; segment: string }>;
  searchParams: Promise<ResultsSearchParams>;
};

export async function generateMetadata({ params, searchParams }: PageProps) {
  return buildResultsMetadata(await params, await searchParams);
}

/** The segment is a category ("/ankara/oda") or a district ("/ankara/cankaya"). */
export default async function SegmentPage({ params, searchParams }: PageProps) {
  return <ResultsPage params={await params} searchParams={await searchParams} />;
}
