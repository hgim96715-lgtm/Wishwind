import Image from "next/image";
import Link from "next/link";

/**
 * 페이지 왼쪽 위 로고. 누르면 홈으로 감 ('홈으로' 버튼 대신).
 * onSky: 실종자들의 정원처럼 배경 색이 시간대마다 바뀌는 곳에서는 반투명 흰 바탕을 깔아 잘 보이게 함
 */
export function HomeLogo({ onSky = false, className = "" }: { onSky?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Wishwind 홈으로"
      className={`inline-flex items-center transition-opacity hover:opacity-80 ${
        onSky ? "logo-pill pointer-events-auto rounded-full bg-white/75 px-3 py-1.5 backdrop-blur" : ""
      } ${className}`}
    >
      <Image src="/wishwind-logo.png" alt="Wishwind" width={720} height={240} className={`brand-logo ${onSky ? "h-7 w-auto" : "h-9 w-auto"}`} />
    </Link>
  );
}
