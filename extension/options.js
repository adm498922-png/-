const input = document.getElementById("siteUrl");
const msg = document.getElementById("msg");

function show(text, isError) {
  msg.textContent = text;
  msg.className = isError ? "msg error" : "msg";
}

chrome.storage.sync.get({ siteUrl: "" }, (data) => {
  input.value = data.siteUrl || "";
});

document.getElementById("save").addEventListener("click", () => {
  let value = input.value.trim().replace(/\/+$/, "");
  if (!value) {
    show("주소를 넣어주세요.", true);
    return;
  }
  // http를 안 적어도 알아서 붙여준다.
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;

  try {
    new URL(value);
  } catch {
    show("주소 형태가 올바르지 않습니다. 다시 확인해주세요.", true);
    return;
  }

  chrome.storage.sync.set({ siteUrl: value }, () => {
    input.value = value;
    show("저장했습니다. 이제 인스타에서 담기 버튼을 쓰실 수 있습니다.");
  });
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("save").click();
});
