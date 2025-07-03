import { Request, Response } from 'express';
import { http } from '@google-cloud/functions-framework';
import fetch from 'node-fetch';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

// Firebaseの初期化
admin.initializeApp();
const db = admin.firestore();

const TOKEN = "eHXIc/RVYArUV5fqIR3z8Brpn9pwnZXdq97o+GykVZ79KSF5yHqcLRvK4fIem6MU7/+5U/GbGXh3Sm9VkEF8zprL5+zZ8HSNEIwmi+X8CYAH2wyDO/AxA8Vh+7D1/SMb0m1geOd0LjlV2sGLhAc+MQdB04t89/1O/w1cDnyilFU=";
const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

const HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Authorization": "Bearer " + TOKEN
};

// リッチメニュー作成用エンドポイント
http('createRichMenuHttp', async (req: Request, res: Response) => {
  const body = {
    size: { width: 1200, height: 810 },
    selected: true,
    name: "scholarship_menu",
    chatBarText: "メニューを開く",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 400, height: 405 },
        action: { type: 'postback', data: 'select_scholarship' }
      },
      {
        bounds: { x: 400, y: 0, width: 400, height: 405 },
        action: { type: 'postback', data: 'document' }
      },
      {
        bounds: { x: 800, y: 0, width: 400, height: 405 },
        action: { type: 'postback', data: 'progress' }
      },
      {
        bounds: { x: 0, y: 405, width: 400, height: 405 },
        action: { type: 'postback', data: 'user_info' }
      },
      {
        bounds: { x: 400, y: 405, width: 400, height: 405 },
        action: { type: 'postback', data: 'pause' }
      },
      {
        bounds: { x: 800, y: 405, width: 400, height: 405 },
        action: { type: 'postback', data: 'submit' }
      }
    ]
  };

  try {
    const response = await fetch("https://api.line.me/v2/bot/richmenu", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    console.log("リッチメニュー作成:", result);
    res.send(`Rich Menu ID: ${result.richMenuId}`);
    console.log(`rich menu ID:${result.richMenuId}`);
  } catch (err) {
    console.error("作成失敗:", err);
    res.status(500).send("リッチメニュー作成に失敗");
  }
});

// 画像アップロード
http('uploadRichMenuImageHttp', async (req: Request, res: Response) => {
  const richMenuId = req.query.richMenuId as string;
  const imagePath = './images/richmenu.png';

  try {
    const response = await fetch(`https://api.line.me/v2/bot/richmenu/${richMenuId}/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'image/png',
      },
      body: fs.createReadStream(imagePath) as any, // node-fetch v2系ならanyでOK
    });

    if (!response.ok) throw new Error(await response.text());

    console.log("画像アップロード完了");
    res.send("画像アップロード完了");
  } catch (err) {
    console.error("アップロード失敗:", err);
    res.status(500).send("画像アップロード失敗");
  }
});


// LINE Webhook
http('helloHttp', async (req: Request, res: Response) => {
  const event = req.body.events[0];
  const replyToken = event.replyToken;

  console.log(event);

  // Firestore にメッセージ保存
  try {
    const userMessage = event.message?.text;
    if (userMessage) {
      console.log("ユーザーメッセージ:", userMessage);
      await db.collection('user').add({
        text: userMessage,
        timestamp: new Date()
      });
      console.log("Firestore への保存完了");
    }
  } catch (error) {
    console.error("Firestore保存エラー:", error);
  }

  // リッチメニュー
  if (event.type === "postback") {
    const postbackData = event.postback.data;
    console.log("リッチメニューのデータ:", postbackData);

    try {
      await db.collection('richmenu').add({
        data: postbackData,
        timestamp: new Date()
      });
      console.log("Firestore → richmenu に保存しました");
    } catch (error) {
      console.error("Firestore保存エラー（richmenu）:", error);
    }

    const postData = {
      replyToken,
      messages: [{
        "type": "template",
        "altText": "This is a buttons template",
        "template": {
          "type": "buttons",
          "imageAspectRatio": "rectangle",
          "imageSize": "cover",
          "imageBackgroundColor": "#FFFFFF",
          "title": "Menu",
          "text": "Please select",
          "defaultAction": {
            "type": "uri",
            "label": "View detail",
            "uri": "http://example.com/page/123"
          },
          "actions": [
            {
              "type": "postback",
              "label": "Buy",
              "data": "action=buy&itemid=123"
            },
            {
              "type": "postback",
              "label": "Add to cart",
              "data": "action=add&itemid=123"
            },
            {
              "type": "uri",
              "label": "View detail",
              "uri": "http://example.com/page/123"
            }
          ]
        }
      }]
    };

    try {
      const response = await fetch(LINE_PUSH_ENDPOINT, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(postData)
      });
      console.log("LINE応答（postback）:", await response.text());
    } catch (error) {
      console.error("LINE返信エラー（postback）:", error);
    }

    return res.status(200).send("Postback処理完了");
  }

  // 通常のメッセージ
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;
    console.log("ユーザーメッセージ:", userMessage);

    try {
      await db.collection('user').add({
        text: userMessage,
        timestamp: new Date()
      });
      console.log("Firestore → user に保存しました");
    } catch (error) {
      console.error("Firestore保存エラー（user）:", error);
    }

    const postData = {
      replyToken,
      messages: [{
        type: "text",
        text: `「${userMessage}」を保存しました。`
      }]
    };

    try {
      const response = await fetch(LINE_PUSH_ENDPOINT, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(postData)
      });
      console.log("LINE応答（テキスト）:", await response.text());
    } catch (error) {
      console.error("LINE返信エラー（テキスト）:", error);
    }

    return res.status(200).send("メッセージ処理完了");
  }
});
