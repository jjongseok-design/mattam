import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">설치 완료!</h1>
        <p className="text-muted-foreground text-center mb-6">
          춘천 맛집지도가 홈화면에 설치되었습니다.
        </p>
        <Link to="/">
          <Button>맛집지도 열기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <img src="/pwa-icon-192.png" alt="앱 아이콘" className="w-24 h-24 rounded-2xl mb-6 shadow-lg" />
      <h1 className="text-2xl font-bold mb-2">춘천 맛집지도</h1>
      <p className="text-muted-foreground text-center mb-8 max-w-sm">
        홈화면에 설치하면 앱처럼 빠르게 사용할 수 있어요!
      </p>

      {deferredPrompt ? (
        <Button size="lg" onClick={handleInstall} className="gap-2">
          <Download className="w-5 h-5" />
          홈화면에 설치하기
        </Button>
      ) : isIOS ? (
        <div className="bg-muted rounded-xl p-6 max-w-sm text-center space-y-3">
          <Share className="w-8 h-8 mx-auto text-primary" />
          <p className="font-medium">iPhone에서 설치하기</p>
          <ol className="text-sm text-muted-foreground text-left space-y-2">
            <li>1. Safari 하단의 <strong>공유 버튼</strong> (□↑) 탭</li>
            <li>2. <strong>"홈 화면에 추가"</strong> 선택</li>
            <li>3. <strong>"추가"</strong> 탭</li>
          </ol>
        </div>
      ) : (
        <div className="bg-muted rounded-xl p-6 max-w-sm text-center space-y-3">
          <Download className="w-8 h-8 mx-auto text-primary" />
          <p className="font-medium">앱 설치하기</p>
          <p className="text-sm text-muted-foreground">
            브라우저 메뉴에서 "앱 설치" 또는 "홈 화면에 추가"를 선택하세요.
          </p>
        </div>
      )}

      <Link to="/" className="mt-6">
        <Button variant="ghost">웹에서 계속 사용하기</Button>
      </Link>
    </div>
  );
};

export default Install;
