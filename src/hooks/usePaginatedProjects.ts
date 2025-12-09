"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const PAGE_SIZE = 12;

export function usePaginatedProjects() {
    const { results, status, loadMore } = usePaginatedQuery(
        api.projects.getPublicProjectsPaginated,
        {},
        { initialNumItems: PAGE_SIZE }
    );

    return {
        projects: results,
        isLoading: status === "LoadingFirstPage",
        isLoadingMore: status === "LoadingMore",
        canLoadMore: status === "CanLoadMore",
        isDone: status === "Exhausted",
        loadMore: () => loadMore(PAGE_SIZE),
    };
}
