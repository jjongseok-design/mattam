import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

const ErrorState = ({ message = "데이터를 불러오는데 실패했습니다", onRetry }: ErrorStateProps) => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive/60" />
      <div>
        <p className="text-foreground font-semibold">{message}</p>
        <p className="text-sm text-muted-foreground mt-1">네트워크 연결을 확인하고 다시 시도해주세요</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          다시 시도
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
