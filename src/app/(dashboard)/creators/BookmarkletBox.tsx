"use client";

import { useCallback, useState } from "react";

/**
 * 인스타그램 프로필을 보다가 한 번 눌러서 이 사이트로 담아오는 즐겨찾기 버튼.
 * 사용자의 브라우저에서 지금 보고 있는 프로필 화면의 글자를 그대로 읽어
 * 크리에이터 추가 화면을 채운 채로 연다.
 */
export default function BookmarkletBox({ origin }: { origin: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // "javascript:" 를 글자 그대로 코드에 적어두면 빌드 도구가 이 파일을 통째로
  // 잘못 처리해서 화면이 안 움직인다. 그래서 조각내서 붙인다.
  const scheme = ["java", "script", ":"].join("");
  // 인스타 프로필 화면에서만 동작하고, 잘못 누르면 무엇이 잘못됐는지 알려준다.
  // 프로필 화면의 글자 + 탭 제목(이름·아이디가 확실히 들어 있음) + 프로필 사진을 담아 보낸다.
  const code =
    `${scheme}(function(){` +
    `try{` +
    `if(!/instagram\\.com$/.test(location.hostname)){alert('인스타그램 프로필 화면에서 눌러주세요.');return;}` +
    `var s=location.pathname.split('/').filter(Boolean);var u=s[0]||'';` +
    `if(!u||['p','reel','reels','explore','stories','direct','accounts','challenge'].indexOf(u)>=0){` +
    `alert('게시물이 아니라 크리에이터 프로필 화면에서 눌러주세요.');return;}` +
    `var h=document.querySelector('header')||document.querySelector('main')||document.body;` +
    `var t=(h.innerText||'').slice(0,1000);` +
    `var im=h.querySelector('img');var g=im&&im.src?im.src.slice(0,600):'';` +
    `var d=document.title+'\\n'+'https://www.instagram.com/'+u+'/\\n'+t;` +
    `window.open('${origin}/creators?add=1&handle='+encodeURIComponent(u)+'&img='+encodeURIComponent(g)+'&paste='+encodeURIComponent(d),'_blank');` +
    `}catch(e){alert('정보를 읽지 못했습니다. 프로필 화면을 복사해서 붙여넣어 주세요.');}` +
    `})()`;

  // React는 href에 javascript: 주소를 넣는 것을 막는다.
  // 즐겨찾기로 끌어다 놓으려면 주소가 실제로 붙어 있어야 해서, 붙은 뒤에 직접 넣어준다.
  const attachHref = useCallback(
    (el: HTMLAnchorElement | null) => {
      if (el) el.setAttribute("href", code);
    },
    [code]
  );

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-neutral-800 p-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-neutral-400 underline underline-offset-4 hover:text-neutral-200"
        >
          인스타 보다가 한 번에 담기 — 처음 한 번만 설정하면 됩니다
        </button>
      ) : (
        <div className="space-y-3 text-xs text-neutral-400">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-neutral-200">
              인스타 보다가 한 번에 담기 — 처음 한 번만 설정
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-neutral-500 hover:text-white"
            >
              닫기
            </button>
          </div>

          <ol className="space-y-2">
            <li>
              <span className="mr-1.5 font-semibold text-neutral-200">1.</span>
              컴퓨터 크롬에서 즐겨찾기 막대를 켭니다 —{" "}
              <span className="text-neutral-300">Ctrl+Shift+B</span> (맥은{" "}
              <span className="text-neutral-300">⌘+Shift+B</span>). 주소창 아래
              한 줄이 생깁니다.
            </li>
            <li>
              <span className="mr-1.5 font-semibold text-neutral-200">2.</span>
              아래 파란 버튼을{" "}
              <strong className="text-neutral-200">
                그 즐겨찾기 막대로 끌어다 놓으세요.
              </strong>
              <div className="mt-2">
                <a
                  ref={attachHref}
                  onClick={(e) => e.preventDefault()}
                  draggable
                  className="inline-block cursor-grab rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  ＋ 공구 크리에이터 담기
                </a>
              </div>
            </li>
            <li>
              <span className="mr-1.5 font-semibold text-neutral-200">3.</span>
              끝났습니다. 이제 인스타그램에서 마음에 드는 크리에이터{" "}
              <strong className="text-neutral-200">프로필 화면</strong>을 열고
              즐겨찾기의 그 버튼을 누르면, 새 탭이 열리면서 이 화면에 정보가
              채워져 있습니다. 확인하고 저장만 누르면 됩니다.
            </li>
          </ol>

          <div className="border-t border-neutral-800 pt-2.5">
            <p className="mb-1.5">
              끌어다 놓기가 잘 안 되면, 아래로 주소를 복사한 뒤 즐겨찾기를 직접
              추가하면서 주소 칸에 붙여넣어도 됩니다.
            </p>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg border border-neutral-700 px-2.5 py-1 text-[11px] text-neutral-300 hover:text-white"
            >
              {copied ? "복사했습니다" : "주소 복사하기"}
            </button>
          </div>

          <p className="text-neutral-600">
            게시물이나 릴스 화면에서 누르면 &quot;프로필 화면에서 눌러주세요&quot;라고
            알려줍니다. 휴대폰에서는 즐겨찾기 버튼을 쓰기 어려우니, 프로필
            화면을 길게 눌러 복사한 뒤 위의 붙여넣기 칸을 쓰세요.
          </p>
        </div>
      )}
    </div>
  );
}
