/**
 * 페이지 전환 시에도 유지되는 모듈 레벨 방문 카운트 저장소.
 * React Query 캐시 타이밍 문제를 우회하여 즉각적인 UI 반영을 보장한다.
 */
export const visitCountStore: Record<string, number> = {};  // 식당별 총 방문수
export const myVisitCountStore: Record<string, number> = {}; // 식당별 내 방문수

export function applyVisit(restaurantId: string) {
  visitCountStore[restaurantId] = (visitCountStore[restaurantId] ?? 0) + 1;
  myVisitCountStore[restaurantId] = (myVisitCountStore[restaurantId] ?? 0) + 1;
}

export function applyRevisit(restaurantId: string) {
  visitCountStore[restaurantId] = (visitCountStore[restaurantId] ?? 0) + 1;
  myVisitCountStore[restaurantId] = (myVisitCountStore[restaurantId] ?? 0) + 1;
}

export function applyCancel(restaurantId: string) {
  visitCountStore[restaurantId] = Math.max(0, (visitCountStore[restaurantId] ?? 1) - 1);
  myVisitCountStore[restaurantId] = Math.max(0, (myVisitCountStore[restaurantId] ?? 1) - 1);
}

/** DB에서 실제 카운트를 가져온 후 로컬 델타를 병합하여 최종 값 반환 */
export function mergeVisitCount(restaurantId: string, dbCount: number): number {
  return dbCount + (visitCountStore[restaurantId] ?? 0);
}

export function mergeMyVisitCount(restaurantId: string, dbCount: number): number {
  return dbCount + (myVisitCountStore[restaurantId] ?? 0);
}
