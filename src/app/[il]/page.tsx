import {
  buildResultsMetadata,
  ResultsPage,
  type ResultsSearchParams,
} from "@/components/listings/ResultsPage";

type PageProps = {
  params: Promise<{ il: string }>;
  searchParams: Promise<ResultsSearchParams>;
};

export async function generateMetadata({ params, searchParams }: PageProps) {
  return buildResultsMetadata(await params, await searchParams);
}

export default async function ProvincePage({ params, searchParams }: PageProps) {
  return <ResultsPage params={await params} searchParams={await searchParams} />;
}
