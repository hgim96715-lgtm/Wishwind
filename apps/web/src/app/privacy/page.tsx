import type { Metadata } from "next";
import Link from "next/link";
import { HomeLogo } from "@/components/common/HomeLogo";

export const metadata: Metadata = { title: "개인정보 처리방침" };

/** 출시 전 법률 검토 필요 (docs/notice.md). 시행일은 공개 전에 확정 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 leading-7">
      <HomeLogo />
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">개인정보 처리방침</h1>
      <p className="mt-4 text-muted">
        Wishwind는 사건과 실종 이야기를 함께 기억하기 위한 사이트입니다. 필요한 정보만 최소한으로 받고, 아래와 같이 다룹니다.
      </p>

      <h2 className="mt-10 text-lg font-semibold">1. 받는 정보</h2>
      <ul className="mt-2 list-disc pl-5 text-muted">
        <li>로그인하지 않은 경우: 이름·연락처를 받지 않습니다. 브라우저를 구분하는 무작위 번호(익명 ID)만 쿠키에 저장합니다.</li>
        <li>
          네이버·구글로 로그인한 경우: 각 서비스가 알려 주는 <strong>계정 고유 번호</strong>만 저장합니다. 이메일, 이름, 프로필 사진,
          전화번호는 요청하지도 저장하지도 않습니다. 사이트에서 쓰는 닉네임은 네이버·구글에서 가져오지 않고, 직접 정한 것만
          저장합니다(정하지 않으면 &lsquo;바람 123&rsquo; 같은 무작위 이름).
        </li>
        <li>방문 통계: IP 주소 원문은 저장하지 않고, 날마다 바뀌는 해시값으로만 방문 수를 셉니다.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">2. 쓰는 곳</h2>
      <ul className="mt-2 list-disc pl-5 text-muted">
        <li>내가 남긴 수사 노트·질문·형량 의견·바람개비를 &lsquo;○○님의 기록&rsquo;에 모아 보여 주기</li>
        <li>1인 1표·도배 방지, 운영 정책을 어긴 글 작성 제한</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">3. 보관과 삭제</h2>
      <ul className="mt-2 list-disc pl-5 text-muted">
        <li>계정 연결 정보는 탈퇴할 때 바로 지웁니다. 내 기록 페이지 아래의 &lsquo;탈퇴하기&rsquo;에서 할 수 있습니다.</li>
        <li>남긴 글은 탈퇴 후 익명 글로 남습니다. 글 삭제를 원하면 문의하기로 알려 주세요.</li>
        <li>로그인 유지 쿠키는 30일, 익명 ID 쿠키는 최대 400일 동안 브라우저에 남습니다.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">4. 다른 곳에 주는 정보</h2>
      <p className="mt-2 text-muted">받은 정보를 다른 회사나 기관에 팔거나 넘기지 않습니다. 광고에도 쓰지 않습니다.</p>

      <h2 className="mt-8 text-lg font-semibold">5. 문의</h2>
      <p className="mt-2 text-muted">
        개인정보에 대해 궁금한 점은{" "}
        <Link href="/contact" className="underline underline-offset-2">
          문의하기
        </Link>
        로 남겨 주세요.
      </p>
    </main>
  );
}
