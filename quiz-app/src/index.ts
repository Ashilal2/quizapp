import { Request, Response } from "express";
import { http } from "@google-cloud/functions-framework";
import fetch from "node-fetch";
import * as admin from "firebase-admin";
import * as fs from "fs";

// Firebaseの初期化
admin.initializeApp();
const db = admin.firestore();

const TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/reply";
const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

const HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  Authorization: "Bearer " + TOKEN,
};

// LINE Webhook
http("helloHttp", async (req: Request, res: Response) => {
  try {
    const event = req.body.events[0];

    const replyToken = event.replyToken;
    console.log("Received event:", event);

    // Firestoreへのイベント保存を先に行う
    // 返信処理をブロックしないように非同期で実行
    db.collection("events")
      .add({
        ...event,
        processedAt: new Date(),
      })
      .catch((err) => {
        console.error("Firestore保存エラー:", err);
      });

    // テキストメッセージイベントの処理
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text;
      let messages;

      if (userMessage.includes("奨学金")) {
        messages = [
          {
            type: "template",
            altText: "奨学金の一覧です。",
            template: {
              type: "carousel",
              columns: [
                {
                  thumbnailImageUrl: "https://i.imgur.com/abc123.jpg",
                  imageBackgroundColor: "#FFFFFF",
                  title: "JASSO 奨学金",
                  text: "返済不要の奨学金です。",
                  actions: [
                    {
                      type: "uri",
                      label: "詳しく見る",
                      uri: "https://www.jasso.go.jp/shogakukin/about/kyufu/",
                    },
                  ],
                },
                {
                  thumbnailImageUrl: "https://i.imgur.com/abc123.jpg",
                  title: "コカコーラ奨学金",
                  text: "貸与型の奨学金です。",
                  actions: [
                    {
                      type: "uri",
                      label: "詳しく見る",
                      uri: "https://www.cocacola-zaidan.jp/edu-support/scholarship01.html",
                    },
                  ],
                },
              ],
            },
          },
        ];
      } else {
        // その他のメッセージ
        messages = [
          {
            type: "text",
            text: `「${userMessage}」ですね。`,
          },
        ];
      }

      // LINEに送信
      const postData = { replyToken: event.replyToken, messages };
      await fetch(LINE_REPLY_ENDPOINT, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(postData),
      });

      return res.status(200).send("Message processed.");
    }

    // ポストバックイベントの処理
    else if (event.type === "postback") {
      const postbackData = event.postback.data;
      const messages = [
        {
          type: "text",
          text: `ポストバックデータ「${postbackData}」を受信しました。この機能は現在準備中です。`,
        },
      ];

      // LINEに応答を送信
      const postData = { replyToken, messages };
      await fetch(LINE_REPLY_ENDPOINT, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(postData),
      });

      return res.status(200).send("Postback processed.");
    }

    // 対応していないイベントタイプの場合
    console.log(`Unsupported event type: ${event.type}`);
    return res.status(200).send("OK");
  } catch (error) {
    console.error("エラーが発生しました:", error);
    // エラーが発生してもLINEプラットフォームには200 OKを返すのが一般的
    // 500を返すとリトライが繰り返される可能性があるため
    return res.status(200).send("Error processing request.");
  }
});
