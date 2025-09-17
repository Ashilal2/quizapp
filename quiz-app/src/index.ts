import { Request, Response } from "express";
import { http } from "@google-cloud/functions-framework";
import { db } from "./firebase";
import { sendLineReply } from "./services/line-service";
import { handleAnswerFlow } from "./services/answer-service";
import { startApplicationFlow } from "./services/question-service";
import {
  handleScholarshipMenuFromFirestore,
  handleRequiredDocuments,
  handleDefaultReply,
} from "./services/scholarship-service";

http("helloHttp", async (req: Request, res: Response) => {
  try {
    const event = req.body.events[0];
    if (!event || !event.replyToken) {
      return res.status(200).send("No valid event.");
    }

    const replyToken = event.replyToken;
    const userMessage = event.message?.text ?? "";

    // Firestore保存
    db.collection("events")
      .add({ ...event, processedAt: new Date() })
      .catch((err) => console.error("Firestore保存エラー:", err));

    // メッセージイベントの処理
    if (event.type === "message" && event.message.type === "text") {
      const userId = event.source?.userId;
      if (!userId) {
        return res.status(200).send("No userId.");
      }

      // リッチメニューのコマンドか判定
      // [xxx] がついたものはコマンドとして処理
      if (userMessage.startsWith("[") && userMessage.endsWith("]")) {
        const command = userMessage.slice(1, -1);
        let messages;
        if (command.includes("初学金を選ぶ")) {
          messages = await handleScholarshipMenuFromFirestore();
        } else if (command.includes("必要書類")) {
          messages = handleRequiredDocuments();
        } else {
          messages = handleDefaultReply(command); // 括弧を外してオウム返し
        }
        await sendLineReply(replyToken, messages);
        return res.status(200).send("Command processed.");
        // 早期リターン []がついたものは質問の回答として受け取らない
      }

      // 質問への回答か判断
      const stateQuery = await db
        .collection("state")
        .where("userId", "==", userId)
        .where("isSuspend", "==", false)
        .limit(1)
        .get();

      if (!stateQuery.empty) {
        const stateDoc = stateQuery.docs[0];
        const stateData = stateDoc.data();

        if (stateData.expectedAnswerType === 1) {
          // テキスト回答を期待している場合
          await handleAnswerFlow(
            replyToken,
            userId,
            stateData.scholarshipId,
            stateData.currentQuestionId,
            userMessage
          );
        } else {
          // ボタン回答を期待しているのにテキストが来た場合
          await sendLineReply(replyToken, [
            { type: "text", text: "ボタンから選択してください。" },
          ]);
        }
        return res.status(200).send("Answer processed.");
      }
    }

    // postbackイベントの処理
    if (event.type === "postback") {
      const data = event.postback.data;
      const params = new URLSearchParams(data);
      const action = params.get("action");
      const scholarshipId = params.get("scholarshipId");
      const userId = event.source?.userId;

      console.log("scholarshipId" + scholarshipId);

      if (!userId || !scholarshipId) {
        // 必要な情報がない場合は早期リターン
        return res.status(200).send("Missing required params.");
      }

      if (action === "startApply") {
        await startApplicationFlow(replyToken, userId, scholarshipId);
      } else if (action === "answer") {
        // ★新しい処理：回答を受け取るフローを呼び出す
        const questionId = params.get("questionId");
        const value = params.get("value");
        if (questionId && value) {
          await handleAnswerFlow(
            replyToken,
            userId,
            scholarshipId,
            questionId,
            value
          );
        }
      }
    }

    console.log(`Unsupported event type: ${event.type}`);
    return res.status(200).send("OK");
  } catch (error) {
    console.error("エラー:", error);
    return res.status(200).send("Error processing request.");
  }
});
