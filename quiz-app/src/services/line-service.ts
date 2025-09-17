// LINEAPI呼び出し

import fetch from "node-fetch";

const TOKEN = process.env.LINE_ACCESS_TOKEN!;
const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";
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
