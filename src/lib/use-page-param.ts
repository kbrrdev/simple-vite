import { useSearchParams } from 'react-router';

/** The list page number in `?page=`. It is 1 when missing or not a positive whole number. */
export function usePageParam() {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = Number(searchParams.get('page'));
  const page = Number.isInteger(value) && value >= 1 ? value : 1;

  const setPage = (newPage: number) =>
    setSearchParams((params) => {
      params.set('page', String(newPage));
      return params;
    });

  return [page, setPage] as const;
}
