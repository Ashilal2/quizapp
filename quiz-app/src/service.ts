// import { Request, Response } from "express";
// import * as admin from "firebase-admin";
// import fetch from "node-fetch";
// import { db } from "./firebase";

// const TOKEN = process.env.LINE_ACCESS_TOKEN!;
// const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

// const HEADERS = {
//   "Content-Type": "application/json; charset=UTF-8",
//   Authorization: `Bearer ${TOKEN}`,
// };

// // メソッドA
// export const helloWorld = async (req: Request, res: Response) => {
//   console.log("Hello from Method A!");
// };

// // メソッドB
// export const goodbyeWorld = (req: Request, res: Response) => {
//   console.log("Hello from Method B!");
// };

// // export async function handleScholarshipMenuFromFirestore(): Promise<any[]> {
// //   const citiesRef = db.collection("scholarships");
// //   const snapshot = await citiesRef.where("type", "array-contains", "2").get();

// //   console.log(snapshot.docs);

// //   if (snapshot.empty) {
// //     return [
// //       {
// //         type: "text",
// //         text: "現在、表示できる奨学金はありません。",
// //       },
// //     ];
// //   }
// //   const columns = snapshot.docs.map((doc) => {
// //     const data = doc.data();
// //     console.log(data);
// //     return {
// //       thumbnailImageUrl: data.imageUrl || "https://i.imgur.com/abc123.jpg",
// //       title: data.name,
// //       text: data.description.slice(0, 60),
// //       actions: [
// //         {
// //           type: "uri",
// //           label: "詳しく見る",
// //           uri: "https://example.com/scholarship/" + doc.id,
// //         },
// //         {
// //           type: "postback",
// //           label: "申請を始める",
// //           data: `action=startApply&scholarshipId=${doc.id}`,
// //         },
// //       ],
// //     };
// //   });

// //   return [
// //     {
// //       type: "template",
// //       altText: "奨学金の一覧です。",
// //       template: {
// //         type: "carousel",
// //         columns: columns.slice(0, 5), // LINEのカルーセルは最大5件まで
// //       },
// //     },
// //   ];
// // }

// export async function sendLineReply(replyToken: string, messages: any[]) {
//   const postData = { replyToken, messages };
//   const response = await fetch(LINE_REPLY_ENDPOINT, {
//     method: "POST",
//     headers: HEADERS,
//     body: JSON.stringify(postData),
//   });

//   const text = await response.text();
//   console.log("LINE API Response:", response.status, text);
// }

// export async function handleAnswerFlow(
//   replyToken: string,
//   userId: string,
//   scholarshipId: string,
//   questionId: string,
//   answer: string
// ) {
//   const stateRef = db.collection("state").doc(`${userId}_${scholarshipId}`);
//   const stateDoc = await stateRef.get();

//   if (!stateDoc.exists) {
//     // stateがない場合はエラー（ありえないはず）
//     return await sendLineReply(replyToken, [
//       {
//         type: "text",
//         text: "エラーが発生しました。もう一度最初からお試しください。",
//       },
//     ]);
//   }

//   // 1. 回答をFirestoreに保存
//   // 'answers' フィールドに、質問IDと回答のマップを保存
//   await stateRef.update({
//     [`answers.${questionId}`]: answer,
//   });

//   const updatedStateDoc = await stateRef.get();
//   if (updatedStateDoc.exists) {
//     console.log(
//       "【データ保存後のstate】:",
//       JSON.stringify(updatedStateDoc.data(), null, 2)
//     );
//   }

//   // 2. 次の質問IDを計算
//   const currentQuestionId = parseInt(questionId, 10);
//   const nextQuestionId = (currentQuestionId + 1).toString();

//   // 3. 次の質問をFirestoreから取得
//   const nextQuestionRef = db
//     .collection("scholarships")
//     .doc(scholarshipId)
//     .collection("question")
//     .doc(nextQuestionId);

//   const nextQuestionDoc = await nextQuestionRef.get();

//   if (nextQuestionDoc.exists) {
//     const nextQuestionData = nextQuestionDoc.data();
//     await sendQuestion(replyToken, scholarshipId, nextQuestionDoc);
//     // stateを次の質問IDに更新
//     await stateRef.update({
//       currentQuestionId: nextQuestionId,
//       expectedAnswerType: nextQuestionData.type,
//     });
//   } else {
//     await completeApplicationFlow(replyToken, userId, scholarshipId);
//   }
// }

// export async function sendQuestion(
//   replyToken: string,
//   scholarshipId: string,
//   questionDoc: admin.firestore.DocumentSnapshot
// ) {
//   const question = questionDoc.data();
//   if (!question) return;

//   const questionId = questionDoc.id;
//   let message;

//   // 質問タイプに応じてLINEメッセージの形式を切り替える
//   switch (question.type) {
//     case 1: // 1: テキスト入力
//       message = { type: "text", text: question.content };
//       break;

//     case 2: // 2: 2択 (はい/いいえ など)
//     case 4: // 4: 複数選択肢から1つ
//       message = {
//         type: "template",
//         altText: question.content,
//         template: {
//           type: "buttons",
//           text: question.content,
//           actions: question.select.map((option: string) => ({
//             type: "postback",
//             label: option,
//             data: `action=answer&scholarshipId=${scholarshipId}&questionId=${questionId}&value=${encodeURIComponent(
//               option
//             )}`,
//           })),
//         },
//       };
//       break;

//     case 3: // 3: 複数選択
//       // 複数選択はQuick Replyで表現するのが一般的
//       message = {
//         type: "text",
//         text: question.content,
//         quickReply: {
//           items: question.select.map((option: string) => ({
//             type: "action",
//             action: {
//               type: "postback",
//               label: option,
//               displayText: `${option}を選択しました`,
//               data: `action=answer&scholarshipId=${scholarshipId}&questionId=${questionId}&value=${encodeURIComponent(
//                 option
//               )}`,
//             },
//           })),
//         },
//       };
//       break;

//     default: // 不明なタイプ
//       message = { type: "text", text: "エラー：不明な質問タイプです。" };
//       break;
//   }
//   await sendLineReply(replyToken, [message]);
// }

// // 申請完了時の処理を行う関数
// async function completeApplicationFlow(
//   replyToken: string,
//   userId: string,
//   scholarshipId: string
// ) {
//   await sendLineReply(replyToken, [
//     {
//       type: "text",
//       text: "お疲れ様でした。以上で質問は終了です。ご回答ありがとうございました！",
//     },
//   ]);
//   // stateを削除または完了済みに更新
//   await db.collection("state").doc(`${userId}_${scholarshipId}`).update({
//     isSuspend: true, // 完了フラグ
//   });
// }
