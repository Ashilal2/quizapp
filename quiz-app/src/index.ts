import { Request, Response } from "express";
import { http } from "@google-cloud/functions-framework";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const TOKEN = process.env.LINE_ACCESS_TOKEN!;
const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

const HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  Authorization: `Bearer ${TOKEN}`,
};

// メイン関数
http("helloHttp", async (req: Request, res: Response) => {
  try {
    const event = req.body.events[0];
    if (!event || !event.replyToken) {
      return res.status(200).send("No valid event.");
    }

    const replyToken = event.replyToken;
    const userMessage = event.message?.text ?? "";

    // Firestore保存（非同期）
    db.collection("events")
      .add({ ...event, processedAt: new Date() })
      .catch((err) => console.error("Firestore保存エラー:", err));

    // メッセージイベントの処理
    if (event.type === "message" && event.message.type === "text") {
      let messages;

      if (userMessage.includes("奨学金")) {
        messages = await handleScholarshipMenuFromFirestore();
      } else if (userMessage.includes("必要書類")) {
        messages = handleRequiredDocuments();
      } else {
        messages = handleDefaultReply(userMessage);
      }

      await sendLineReply(replyToken, messages);
      return res.status(200).send("Message processed.");
    }

    // postbackイベントの処理
    if (event.type === "postback") {
      const data = event.postback.data;
      const params = new URLSearchParams(data);
      const action = params.get("action");
      const scholarshipId = params.get("scholarshipId");
      const userId = event.source?.userId;

      if (action === "startApply" && scholarshipId && userId) {
        await startApplicationFlow(replyToken, userId, scholarshipId);
        return res.status(200).send("Postback handled.");
      }
    }

    console.log(`Unsupported event type: ${event.type}`);
    return res.status(200).send("OK");
  } catch (error) {
    console.error("エラー:", error);
    return res.status(200).send("Error processing request.");
  }
});

async function handleScholarshipMenuFromFirestore(): Promise<any[]> {
  const citiesRef = db.collection("scholarships");
  const snapshot = await citiesRef.where("type", "array-contains", "2").get();

  if (snapshot.empty) {
    return [
      {
        type: "text",
        text: "現在、表示できる奨学金はありません。",
      },
    ];
  }

  console.log(snapshot.docs);

  const columns = snapshot.docs.map((doc) => {
    const data = doc.data();
    console.log(data);
    return {
      thumbnailImageUrl: data.imageUrl || "https://i.imgur.com/abc123.jpg",
      title: data.name,
      text: data.description.slice(0, 60),
      actions: [
        {
          type: "uri",
          label: "詳しく見る",
          uri: "https://example.com/scholarship/" + data.id,
        },
        {
          type: "postback",
          label: "申請を始める",
          data: `action=startApply&scholarshipId=${data.id}`,
        },
      ],
    };
  });

  return [
    {
      type: "template",
      altText: "奨学金の一覧です。",
      template: {
        type: "carousel",
        columns: columns.slice(0, 5), // LINEのカルーセルは最大5件まで
      },
    },
  ];
}

function handleRequiredDocuments() {
  return [
    {
      type: "text",
      text: "必要書類のご案内です。\n1. 住民票\n2. 所得証明書\n3. 成績証明書\n...",
    },
  ];
}

function handleDefaultReply(userMessage: string) {
  return [
    {
      type: "text",
      text: `「${userMessage}」ですね。`,
    },
  ];
}

async function sendLineReply(replyToken: string, messages: any[]) {
  const postData = { replyToken, messages };
  const response = await fetch(LINE_REPLY_ENDPOINT, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(postData),
  });

  const text = await response.text();
  console.log("LINE API Response:", response.status, text);
}

async function startApplicationFlow(
  replyToken: string,
  userId: string,
  scholarshipId: string
) {
  // 奨学金に紐づく質問を取得
  const questionsSnapshot = await db
    .collection("questions")
    .where("scholarshipId", "==", scholarshipId)
    .get();

  if (questionsSnapshot.empty) {
    return await sendLineReply(replyToken, [
      { type: "text", text: "この奨学金には質問が登録されていません。" },
    ]);
  }

  const firstQuestion = questionsSnapshot.docs[0].data();
  const firstQuestionId = questionsSnapshot.docs[0].id;

  // Firestoreに進行状況を保存
  await db.collection("state").doc(`${userId}_${scholarshipId}`).set({
    userId,
    scholarshipId,
    currentQuestionId: firstQuestionId,
    progress: 0,
    isSuspend: false,
    date: new Date(),
  });

  // LINEに質問を送信
  await sendLineReply(replyToken, [
    {
      type: "text",
      text: firstQuestion.content,
    },
  ]);
}
