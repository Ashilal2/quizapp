// import { Request, Response } from "express";
// import { http } from "@google-cloud/functions-framework";
// import fetch from "node-fetch";
// import { db } from "./firebase";

// import {
//   helloWorld,
//   goodbyeWorld,
//   sendLineReply,
//   handleAnswerFlow,
//   sendQuestion,
// } from "./service";
// export {
//   helloWorld,
//   goodbyeWorld,
//   sendLineReply,
//   handleAnswerFlow,
//   sendQuestion,
// };

// // admin.initializeApp();
// // const db = admin.firestore();

// const TOKEN = process.env.LINE_ACCESS_TOKEN!;
// const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

// const HEADERS = {
//   "Content-Type": "application/json; charset=UTF-8",
//   Authorization: `Bearer ${TOKEN}`,
// };

// // メイン関数
// http("helloHttp", async (req: Request, res: Response) => {
//   helloWorld(req, res);

//   try {
//     const event = req.body.events[0];
//     if (!event || !event.replyToken) {
//       return res.status(200).send("No valid event.");
//     }

//     const replyToken = event.replyToken;
//     const userMessage = event.message?.text ?? "";

//     // Firestore保存
//     db.collection("events")
//       .add({ ...event, processedAt: new Date() })
//       .catch((err) => console.error("Firestore保存エラー:", err));

//     // メッセージイベントの処理
//     if (event.type === "message" && event.message.type === "text") {
//       const userId = event.source?.userId;
//       if (!userId) {
//         return res.status(200).send("No userId.");
//       }

//       // リッチメニューのコマンドか判定
//       // [xxx] がついたものはコマンドとして処理
//       if (userMessage.startsWith("[") && userMessage.endsWith("]")) {
//         const command = userMessage.slice(1, -1);
//         let messages;
//         if (command.includes("初学金を選ぶ")) {
//           messages = await handleScholarshipMenuFromFirestore();
//         } else if (command.includes("必要書類")) {
//           messages = handleRequiredDocuments();
//         } else {
//           messages = handleDefaultReply(command); // 括弧を外してオウム返し
//         }
//         await sendLineReply(replyToken, messages);
//         return res.status(200).send("Command processed.");
//         // 早期リターン []がついたものは質問の回答として受け取らない
//       }

//       // 質問への回答か判断
//       const stateQuery = await db
//         .collection("state")
//         .where("userId", "==", userId)
//         .where("isSuspend", "==", false)
//         .limit(1)
//         .get();

//       if (!stateQuery.empty) {
//         const stateDoc = stateQuery.docs[0];
//         const stateData = stateDoc.data();

//         if (stateData.expectedAnswerType === 1) {
//           // テキスト回答を期待している場合
//           await handleAnswerFlow(
//             replyToken,
//             userId,
//             stateData.scholarshipId,
//             stateData.currentQuestionId,
//             userMessage
//           );
//         } else {
//           // ボタン回答を期待しているのにテキストが来た場合
//           await sendLineReply(replyToken, [
//             { type: "text", text: "ボタンから選択してください。" },
//           ]);
//         }
//         return res.status(200).send("Answer processed.");
//       }
//     }

//     // postbackイベントの処理
//     if (event.type === "postback") {
//       const data = event.postback.data;
//       const params = new URLSearchParams(data);
//       const action = params.get("action");
//       const scholarshipId = params.get("scholarshipId");
//       const userId = event.source?.userId;

//       console.log("scholarshipId" + scholarshipId);

//       if (!userId || !scholarshipId) {
//         // 必要な情報がない場合は早期リターン
//         return res.status(200).send("Missing required params.");
//       }

//       if (action === "startApply") {
//         await startApplicationFlow(replyToken, userId, scholarshipId);
//       } else if (action === "answer") {
//         // ★新しい処理：回答を受け取るフローを呼び出す
//         const questionId = params.get("questionId");
//         const value = params.get("value");
//         if (questionId && value) {
//           await handleAnswerFlow(
//             replyToken,
//             userId,
//             scholarshipId,
//             questionId,
//             value
//           );
//         }
//       }
//     }

//     console.log(`Unsupported event type: ${event.type}`);
//     return res.status(200).send("OK");
//   } catch (error) {
//     console.error("エラー:", error);
//     return res.status(200).send("Error processing request.");
//   }
// });

// async function handleScholarshipMenuFromFirestore(): Promise<any[]> {
//   const citiesRef = db.collection("scholarships");
//   const snapshot = await citiesRef.where("type", "array-contains", "2").get();

//   console.log(snapshot.docs);

//   if (snapshot.empty) {
//     return [
//       {
//         type: "text",
//         text: "現在、表示できる奨学金はありません。",
//       },
//     ];
//   }
//   const columns = snapshot.docs.map((doc) => {
//     const data = doc.data();
//     console.log(data);
//     return {
//       thumbnailImageUrl: data.imageUrl || "https://i.imgur.com/abc123.jpg",
//       title: data.name,
//       text: data.description.slice(0, 60),
//       actions: [
//         {
//           type: "uri",
//           label: "詳しく見る",
//           uri: "https://example.com/scholarship/" + doc.id,
//         },
//         {
//           type: "postback",
//           label: "申請を始める",
//           data: `action=startApply&scholarshipId=${doc.id}`,
//         },
//       ],
//     };
//   });

//   return [
//     {
//       type: "template",
//       altText: "奨学金の一覧です。",
//       template: {
//         type: "carousel",
//         columns: columns.slice(0, 5), // LINEのカルーセルは最大5件まで
//       },
//     },
//   ];
// }

// function handleRequiredDocuments() {
//   return [
//     {
//       type: "text",
//       text: "必要書類のご案内です。\n1. 住民票\n2. 所得証明書\n3. 成績証明書\n...",
//     },
//   ];
// }

// function handleDefaultReply(userMessage: string) {
//   return [
//     {
//       type: "text",
//       text: `「${userMessage}」ですね。`,
//     },
//   ];
// }

// // function handleDefaultReply(userMessage: string) {
// //   let returnMessage = userMessage.slice(1, -1); // 最初と最後の[]を削除
// //   return [
// //     {
// //       type: "text",
// //       text: `「${returnMessage}」ですね。`,
// //     },
// //   ];
// // }

// // async function sendLineReply(replyToken: string, messages: any[]) {
// //   const postData = { replyToken, messages };
// //   const response = await fetch(LINE_REPLY_ENDPOINT, {
// //     method: "POST",
// //     headers: HEADERS,
// //     body: JSON.stringify(postData),
// //   });

// //   const text = await response.text();
// //   console.log("LINE API Response:", response.status, text);
// // }

// async function startApplicationFlow(
//   replyToken: string,
//   userId: string,
//   scholarshipId: string
// ) {
//   // 奨学金に紐づく質問を取得
//   const questionsSnapshot = await db
//     .collection("scholarships")
//     .doc(scholarshipId)
//     .collection("question")
//     .get();

//   if (questionsSnapshot.empty) {
//     return await sendLineReply(replyToken, [
//       { type: "text", text: "この奨学金には質問が登録されていません。" },
//     ]);
//   }

//   const firstQuestionDoc = questionsSnapshot.docs[0];
//   const firstQuestionData = firstQuestionDoc.data();

//   // Firestoreに進行状況を保存
//   await db.collection("state").doc(`${userId}_${scholarshipId}`).set({
//     userId,
//     scholarshipId,
//     currentQuestionId: firstQuestionDoc.id,
//     answers: {}, // 回答を保存するフィールドを初期化
//     isSuspend: false,
//     date: new Date(),
//     expectedAnswerType: firstQuestionData.type,
//   });

//   // LINEに質問を送信
//   // await sendLineReply(replyToken, [
//   //   {
//   //     type: "text",
//   //     text: firstQuestion.content,
//   //   },
//   // ]);
//   await sendQuestion(replyToken, scholarshipId, firstQuestionDoc);
// }

// // async function sendQuestion(
// //   replyToken: string,
// //   scholarshipId: string,
// //   questionDoc: admin.firestore.DocumentSnapshot
// // ) {
// //   const question = questionDoc.data();
// //   if (!question) return;

// //   const questionId = questionDoc.id;
// //   let message;

// //   // 質問タイプに応じてLINEメッセージの形式を切り替える
// //   switch (question.type) {
// //     case 1: // 1: テキスト入力
// //       message = { type: "text", text: question.content };
// //       break;

// //     case 2: // 2: 2択 (はい/いいえ など)
// //     case 4: // 4: 複数選択肢から1つ
// //       message = {
// //         type: "template",
// //         altText: question.content,
// //         template: {
// //           type: "buttons",
// //           text: question.content,
// //           actions: question.select.map((option: string) => ({
// //             type: "postback",
// //             label: option,
// //             data: `action=answer&scholarshipId=${scholarshipId}&questionId=${questionId}&value=${encodeURIComponent(
// //               option
// //             )}`,
// //           })),
// //         },
// //       };
// //       break;

// //     case 3: // 3: 複数選択
// //       // 複数選択はQuick Replyで表現するのが一般的
// //       message = {
// //         type: "text",
// //         text: question.content,
// //         quickReply: {
// //           items: question.select.map((option: string) => ({
// //             type: "action",
// //             action: {
// //               type: "postback",
// //               label: option,
// //               displayText: `${option}を選択しました`,
// //               data: `action=answer&scholarshipId=${scholarshipId}&questionId=${questionId}&value=${encodeURIComponent(
// //                 option
// //               )}`,
// //             },
// //           })),
// //         },
// //       };
// //       break;

// //     default: // 不明なタイプ
// //       message = { type: "text", text: "エラー：不明な質問タイプです。" };
// //       break;
// //   }
// //   await sendLineReply(replyToken, [message]);
// // }

// // async function handleAnswerFlow(
// //   replyToken: string,
// //   userId: string,
// //   scholarshipId: string,
// //   questionId: string,
// //   answer: string
// // ) {
// //   const stateRef = db.collection("state").doc(`${userId}_${scholarshipId}`);
// //   const stateDoc = await stateRef.get();

// //   if (!stateDoc.exists) {
// //     // stateがない場合はエラー（ありえないはず）
// //     return await sendLineReply(replyToken, [
// //       {
// //         type: "text",
// //         text: "エラーが発生しました。もう一度最初からお試しください。",
// //       },
// //     ]);
// //   }

// //   // 1. 回答をFirestoreに保存
// //   // 'answers' フィールドに、質問IDと回答のマップを保存
// //   await stateRef.update({
// //     [`answers.${questionId}`]: answer,
// //   });

// //   const updatedStateDoc = await stateRef.get();
// //   if (updatedStateDoc.exists) {
// //     console.log(
// //       "【データ保存後のstate】:",
// //       JSON.stringify(updatedStateDoc.data(), null, 2)
// //     );
// //   }

// //   // 2. 次の質問IDを計算
// //   const currentQuestionId = parseInt(questionId, 10);
// //   const nextQuestionId = (currentQuestionId + 1).toString();

// //   // 3. 次の質問をFirestoreから取得
// //   const nextQuestionRef = db
// //     .collection("scholarships")
// //     .doc(scholarshipId)
// //     .collection("question")
// //     .doc(nextQuestionId);

// //   const nextQuestionDoc = await nextQuestionRef.get();

// //   if (nextQuestionDoc.exists) {
// //     const nextQuestionData = nextQuestionDoc.data();
// //     await sendQuestion(replyToken, scholarshipId, nextQuestionDoc);
// //     // stateを次の質問IDに更新
// //     await stateRef.update({
// //       currentQuestionId: nextQuestionId,
// //       expectedAnswerType: nextQuestionData.type,
// //     });
// //   } else {
// //     await completeApplicationFlow(replyToken, userId, scholarshipId);
// //   }
// // }

// // // 申請完了時の処理を行う関数
// // async function completeApplicationFlow(
// //   replyToken: string,
// //   userId: string,
// //   scholarshipId: string
// // ) {
// //   await sendLineReply(replyToken, [
// //     {
// //       type: "text",
// //       text: "お疲れ様でした。以上で質問は終了です。ご回答ありがとうございました！",
// //     },
// //   ]);
// //   // stateを削除または完了済みに更新
// //   await db.collection("state").doc(`${userId}_${scholarshipId}`).update({
// //     isSuspend: true, // 完了フラグ
// //   });
// // }

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

// http("helloHttp", async (req: Request, res: Response) => {
//   try {
//     const event = req.body.events[0];
//     if (!event || !event.replyToken)
//       return res.status(200).send("No valid event.");

//     const replyToken = event.replyToken;
//     const userMessage = event.message?.text ?? "";
//     const userId = event.source?.userId;

//     // Firestoreにイベント保存
//     db.collection("events").add({ ...event, processedAt: new Date() });

//     if (event.type === "message" && event.message.type === "text") {
//       if (!userId) return res.status(200).send("No userId.");
//       if (userMessage.startsWith("[") && userMessage.endsWith("]")) {
//         const command = userMessage.slice(1, -1);
//         let messages;
//         if (command.includes("奨学金を選ぶ"))
//           messages = await handleScholarshipMenuFromFirestore();
//         else if (command.includes("必要書類"))
//           messages = handleRequiredDocuments();
//         else messages = handleDefaultReply(command);
//         await sendLineReply(replyToken, messages);
//         return res.status(200).send("Command processed.");
//       }

//       // 回答フロー
//       const stateQuery = await db
//         .collection("state")
//         .where("userId", "==", userId)
//         .where("isSuspend", "==", false)
//         .limit(1)
//         .get();
//       if (!stateQuery.empty) {
//         const stateData = stateQuery.docs[0].data();
//         if (stateData.expectedAnswerType === 1) {
//           await handleAnswerFlow(
//             replyToken,
//             userId,
//             stateData.scholarshipId,
//             stateData.currentQuestionId,
//             userMessage
//           );
//         } else {
//           await sendLineReply(replyToken, [
//             { type: "text", text: "ボタンから選択してください。" },
//           ]);
//         }
//         return res.status(200).send("Answer processed.");
//       }
//     }

//     if (event.type === "postback") {
//       const params = new URLSearchParams(event.postback.data);
//       const action = params.get("action");
//       const scholarshipId = params.get("scholarshipId");
//       if (action === "startApply" && scholarshipId && userId) {
//         await startApplicationFlow(replyToken, userId, scholarshipId);
//       } else if (action === "answer") {
//         const questionId = params.get("questionId");
//         const value = params.get("value");
//         if (questionId && value && scholarshipId && userId) {
//           await handleAnswerFlow(
//             replyToken,
//             userId,
//             scholarshipId,
//             questionId,
//             value
//           );
//         }
//       }
//     }

//     return res.status(200).send("OK");
//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(200).send("Error processing request.");
//   }
// });

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
