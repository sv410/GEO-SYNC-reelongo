import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type SessionInput = z.infer<typeof api.sessions.create.input>;

export function useGetSession(id: string) {
  return useQuery({
    queryKey: [api.sessions.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.sessions.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch session");
      
      const data = await res.json();
      return api.sessions.get.responses[200].parse(data);
    },
    enabled: !!id,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: SessionInput) => {
      const validated = api.sessions.create.input.parse(input);
      const res = await fetch(api.sessions.create.path, {
        method: api.sessions.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.sessions.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create or join session");
      }
      
      // Can be 200 or 201 based on our API contract
      const data = await res.json();
      if (res.status === 201) return api.sessions.create.responses[201].parse(data);
      return api.sessions.create.responses[200].parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.sessions.get.path, data.id], data);
    }
  });
}
