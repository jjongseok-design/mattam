import { useEffect, useRef, useState, useCallback } from "react";
import type { Restaurant } from "@/hooks/useRestaurants";
import { useToast } from "@/hooks/use-toast";
import type { MapAdapter } from "@/lib/map/types";
import { KakaoAdapter } from "@/lib/map/KakaoAdapter";
import { LeafletAdapter } from "@/lib/map/LeafletAdapter";

interface MapViewProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  visitedIds?: Set<string>;
  isDarkMode?: boolean;
}

type MapStatus = "loading" | "ready" | "error";

const MapView = ({ restaurants, selectedId, onSelect, visitedIds = new Set(), isDarkMode = false }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const { toast } = useToast();

  // Mount the adapter once
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const mount = async () => {
      // Try Kakao first, fall back to Leaflet
      try {
        const kakao = new KakaoAdapter();
        await kakao.init(containerRef.current!);
        if (!cancelled) { adapterRef.current = kakao; setStatus("ready"); }
      } catch (kakaoErr: any) {
        if (cancelled) return;
        console.warn("Kakao failed, switching to Leaflet:", kakaoErr?.message);
        setFallbackReason(kakaoErr?.message ?? "알 수 없는 오류");
        try {
          const leaflet = new LeafletAdapter();
          await leaflet.init(containerRef.current!);
          if (!cancelled) {
            adapterRef.current = leaflet;
            setStatus("ready");
            setTimeout(() => {
              toast({ title: "🗺️ 기본 지도로 전환되었습니다", description: `카카오맵 대신 기본 지도를 표시합니다. (${kakaoErr?.message})` });
            }, 500);
          }
        } catch (leafletErr) {
          if (!cancelled) setStatus("error");
        }
      }
    };

    mount();
    return () => {
      cancelled = true;
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
  }, []); // mount once

  // Update markers when data changes
  useEffect(() => {
    if (status !== "ready" || !adapterRef.current) return;
    adapterRef.current.updateMarkers({ restaurants, selectedId, visitedIds, onSelect });
  }, [status, restaurants, selectedId, visitedIds, onSelect]);

  // Pan to selected restaurant
  useEffect(() => {
    if (status !== "ready" || !selectedId || !adapterRef.current) return;
    const r = restaurants.find((x) => x.id === selectedId);
    if (r) adapterRef.current.panTo(r.lat, r.lng);
  }, [status, selectedId, restaurants]);

  if (status === "loading") {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs">지도 로딩중...</span>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">지도를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {fallbackReason && (
        <div className="absolute left-2 top-2 z-[1000] rounded-md border border-border bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">
          기본 지도로 표시 중{fallbackReason ? ` (${fallbackReason})` : ""}
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full w-full"
        style={
          isDarkMode
            ? { filter: "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)", WebkitFilter: "invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9)" }
            : undefined
        }
      />
    </div>
  );
};

export default MapView;
