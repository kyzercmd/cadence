import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { toast } from "sonner";

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error.message.includes("Network error")) {
          toast.error(error.message, { id: "network-error" }); // Use stable ID to avoid spamming
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        toast.error(error.message || "An error occurred");
      },
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error.message.includes("Network error")) return false;
          return failureCount < 3;
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
