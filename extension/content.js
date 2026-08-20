/**
 * 인스타그램 프로필 화면에 "＋ 공구 허브에 담기" 버튼을 끼워 넣는다.
 *
 * 누르면 지금 화면에 보이는 프로필 정보(이름·아이디·팔로워 수·소개글·프로필 사진)를
 * 모아서, 공구 허브의 크리에이터 등록 화면을 새 탭으로 연다.
 *
 * 인스타그램을 자동으로 돌아다니거나 긁지 않는다. 사용자가 직접 열어 본 화면에서
 * 사용자가 버튼을 눌렀을 때만, 한 명분만 가져온다.
 */

const BUTTON_CLASS = "gonggu-hub-save-button";

// 프로필이 아닌 화면들. 주소의 첫 칸이 이 중 하나면 프로필이 아니다.
const NOT_PROFILE = new Set([
  "p",
  "reel",
  "reels",
  "explore",
  "stories",
  "direct",
  "accounts",
  "challenge",
  "about",
  "legal",
  "emails",
  "your_activity",
]);

function currentHandle() {
  const parts = location.pathname.split("/").filter(Boolean);
  const first = parts[0];
  if (!first) return null;
  if (NOT_PROFILE.has(first.toLowerCase())) return null;
  // /아이디/tagged 처럼 한 칸 더 붙는 경우까지는 프로필로 본다.
  if (parts.length > 2) return null;
  return first;
}

function toast(message) {
  const existing = document.querySelector(".gonggu-hub-toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "gonggu-hub-toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function getSiteUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ siteUrl: "" }, (data) => {
      resolve((data.siteUrl || "").trim().replace(/\/+$/, ""));
    });
  });
}

/** 프로필 사진 주소. 인스타는 사진에 아이디를 alt로 넣어두는 편이다. */
function findProfileImage(header) {
  const images = Array.from(header.querySelectorAll("img"));
  const byAlt = images.find((img) =>
    /프로필 사진|profile picture/i.test(img.getAttribute("alt") || "")
  );
  const picked = byAlt || images[0];
  return picked && picked.src ? picked.src.slice(0, 600) : "";
}

async function handleClick(button) {
  const handle = currentHandle();
  if (!handle) {
    toast("게시물이 아니라 크리에이터 프로필 화면에서 눌러주세요.");
    return;
  }

  const siteUrl = await getSiteUrl();
  if (!siteUrl) {
    toast(
      "먼저 공구 허브 주소를 알려주세요. 크롬 오른쪽 위 확장 프로그램 아이콘을 눌러 입력할 수 있습니다."
    );
    return;
  }

  const header = document.querySelector("header") || document.body;
  const image = findProfileImage(header);

  // 우리가 끼워 넣은 버튼 글자까지 같이 긁히지 않게, 읽는 동안만 잠깐 숨긴다.
  const ours = Array.from(header.querySelectorAll("." + BUTTON_CLASS));
  ours.forEach((el) => (el.style.display = "none"));
  const text = (header.innerText || "").slice(0, 1000);
  ours.forEach((el) => (el.style.display = ""));

  // 탭 제목에 이름과 아이디가 확실히 들어 있어서 같이 보낸다.
  const payload = `${document.title}\nhttps://www.instagram.com/${handle}/\n${text}`;

  const target =
    `${siteUrl}/creators?add=1` +
    `&handle=${encodeURIComponent(handle)}` +
    `&img=${encodeURIComponent(image)}` +
    `&paste=${encodeURIComponent(payload)}`;

  button.disabled = true;
  button.textContent = "담는 중…";
  window.open(target, "_blank");

  setTimeout(() => {
    button.disabled = false;
    button.textContent = "＋ 공구 허브에 담기";
  }, 1500);
}

function makeButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.textContent = "＋ 공구 허브에 담기";
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleClick(button);
  });
  return button;
}

/**
 * 버튼을 어디에 넣을지 고른다.
 * 인스타는 클래스 이름이 수시로 바뀌므로, "팔로우/메시지 보내기 버튼이 모여 있는 줄"을
 * 글자로 찾아 그 옆에 붙인다. 못 찾으면 header 맨 아래에 붙인다.
 */
function findSlot(header) {
  const labels = [
    "메시지 보내기",
    "팔로우",
    "팔로잉",
    "Message",
    "Follow",
    "Following",
  ];
  const candidates = Array.from(header.querySelectorAll("button, a[role='button']"));
  for (const el of candidates) {
    const label = (el.innerText || "").trim();
    if (labels.some((l) => label === l || label.startsWith(l))) {
      return el.parentElement || header;
    }
  }
  return header;
}

function inject() {
  if (!currentHandle()) {
    document.querySelectorAll("." + BUTTON_CLASS).forEach((el) => el.remove());
    return;
  }
  const header = document.querySelector("header");
  if (!header) return;
  if (header.querySelector("." + BUTTON_CLASS)) return;

  findSlot(header).appendChild(makeButton());
}

// 인스타는 화면을 갈아끼우는 방식이라(주소는 바뀌는데 새로고침은 안 됨)
// 계속 지켜보다가 버튼이 사라지면 다시 넣는다.
let lastPath = location.pathname;
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname;
    document.querySelectorAll("." + BUTTON_CLASS).forEach((el) => el.remove());
  }
  inject();
}, 1000);

inject();
