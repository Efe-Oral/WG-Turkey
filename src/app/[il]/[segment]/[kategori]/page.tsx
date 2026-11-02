import {
  buildResultsMetadata,
  ResultsPage,
  type ResultsSearchParams,
} from "@/components/listings/ResultsPage";

type PageProps = {
  params: Promise<{ il: string; segment: string; kategori: string }>;
  searchParams: Promise<ResultsSearchParams>;
};

function toResultsParams(params: Awaited<PageProps["params"]>) {
  return { il: params.il, ilce: params.segment, kategori: params.kategori };
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  return buildResultsMetadata(toResultsParams(await params), await searchParams);
}

export default async function DistrictCategoryPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <ResultsPage
      params={toResultsParams(await params)}
      searchParams={await searchParams}
    />
  );
}
