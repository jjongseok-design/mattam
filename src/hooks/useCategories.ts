import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CategoryRow {
  id: string;
  label: string;
  emoji: string;
  sort_order: number;
  id_prefix: string;
  tag_suggestions: string[];
  tag_placeholder: string;
}

export function useCategories() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        id: d.id,
        label: d.label,
        emoji: d.emoji,
        sort_order: d.sort_order,
        id_prefix: d.id_prefix,
        tag_suggestions: d.tag_suggestions ?? [],
        tag_placeholder: d.tag_placeholder ?? "",
      }));
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const channel = supabase
      .channel("categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["categories"] });
}
