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

export function useCategories(cityId?: string) {
  const queryClient = useQueryClient();
  const queryKey = cityId ? ["categories", cityId] : ["categories"];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CategoryRow[]> => {
      let q = (supabase
        .from("categories")
        .select("*")
        .order("sort_order")) as any;

      if (cityId) {
        q = q.eq("city_id", cityId);
      }

      const { data, error } = await q;
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
      .channel("categories-realtime-" + (cityId ?? "all"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, cityId]);

  return query;
}

export function useInvalidateCategories(cityId?: string) {
  const qc = useQueryClient();
  const queryKey = cityId ? ["categories", cityId] : ["categories"];
  return () => qc.invalidateQueries({ queryKey });
}
