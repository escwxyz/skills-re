import { useNavigate } from "@tanstack/react-router";

export const buildResetBrowseSearch = <T extends Record<string, unknown>>(prev: T) => ({
  ...prev,
  category: undefined,
  q: undefined,
  sort: undefined,
  tag: undefined,
  tags: undefined,
});

export const useResetFilters = () => {
  const navigate = useNavigate();

  const resetFilters = () => {
    navigate({ search: buildResetBrowseSearch, to: "/skills" });
  };

  return { resetFilters };
};
