// LINEAPI呼び出し

import fetch from "node-fetch";

const TOKEN = process.env.LINE_ACCESS_TOKEN!;
const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";
const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";
const HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  Authorization: `Bearer ${TOKEN}`,
};

export async function sendLineReply(replyToken: string, messages: any[]) {
  const postData = { replyToken, messages };
  const response = await fetch(LINE_REPLY_ENDPOINT, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(postData),
  });

  const text = await response.text();
  console.log("LINE API Response:", response.status, text);
}

// replymessageは時間が少ないからプッシュ
export async function sendLinePush(to: string, messages: any[]) {
  const postData = { to, messages };
  const response = await fetch(LINE_PUSH_ENDPOINT, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(postData),
  });
  console.log(
    "LINE API Push Response:",
    response.status,
    await response.text()
  );
}
