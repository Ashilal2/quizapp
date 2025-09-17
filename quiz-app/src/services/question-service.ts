// 質問送信・開始フロー

import * as admin from "firebase-admin";
import { db } from "../firebase";
import { sendLineReply } from "./line-service";
import { completeApplicationFlow } from "./answer-service";

// export async function startApplicationFlow(
//   replyToken: string,
//   userId: string,
//   scholarshipId: string
// ) {
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

//   await db.collection("state").doc(`${userId}_${scholarshipId}`).set({
//     userId,
//     scholarshipId,
//     currentQuestionId: firstQuestionDoc.id,
//     answers: {},
//     isSuspend: false,
//     date: new Date(),
//     expectedAnswerType: firstQuestionData.type,
//   });

//   await sendQuestion(replyToken, scholarshipId, firstQuestionDoc);
// }

export async function startApplicationFlow(
  replyToken: string,
  userId: string,
  scholarshipId: string
) {
  // 奨学金に紐づく質問を取得
  const questionsSnapshot = await db
    .collection("scholarships")
    .doc(scholarshipId)
    .collection("question")
    .get();

  if (questionsSnapshot.empty) {
    return await sendLineReply(replyToken, [
      { type: "text", text: "この奨学金には質問が登録されていません。" },
    ]);
  }

  const firstQuestionDoc = questionsSnapshot.docs[0];
  const firstQuestionData = firstQuestionDoc.data();

  // Firestoreに進行状況を保存
  await db.collection("state").doc(`${userId}_${scholarshipId}`).set({
    userId,
    scholarshipId,
    currentQuestionId: firstQuestionDoc.id,
    answers: {}, // 回答を保存するフィールドを初期化
    isSuspend: false,
    date: new Date(),
    expectedAnswerType: firstQuestionData.type,
  });

  // LINEに質問を送信
  // await sendLineReply(replyToken, [
  //   {
  //     type: "text",
  //     text: firstQuestion.content,
  //   },
  // ]);
  await sendQuestion(replyToken, scholarshipId, firstQuestionDoc);
}

// export async function sendQuestion(
//   replyToken: string,
//   scholarshipId: string,
//   questionDoc: admin.firestore.DocumentSnapshot
// ) {
//   const question = questionDoc.data();
//   if (!question) return;

//   const questionId = questionDoc.id;
//   let message;

//   switch (question.type) {
//     case 1:
//       message = { type: "text", text: question.content };
//       break;
//     case 2:
//     case 4:
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
//     case 3:
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
//     default:
//       message = { type: "text", text: "エラー：不明な質問タイプです。" };
//       break;
//   }

//   await sendLineReply(replyToken, [message]);
// }

export async function sendQuestion(
  replyToken: string,
  scholarshipId: string,
  questionDoc: admin.firestore.DocumentSnapshot
) {
  const question = questionDoc.data();
  if (!question) return;

  const questionId = questionDoc.id;
  let message;

  // 質問タイプに応じてLINEメッセージの形式を切り替える
  switch (question.type) {
    case 1: // 1: テキスト入力
      message = { type: "text", text: question.content };
      break;

    case 2: // 2: 2択 (はい/いいえ など)
    case 4: // 4: 複数選択肢から1つ
      message = {
        type: "template",
        altText: question.content,
        template: {
          type: "buttons",
          text: question.content,
          actions: question.select.map((option: string) => ({
            type: "postback",
            label: option,
            data: `action=answer&scholarshipId=${scholarshipId}&questionId=${questionId}&value=${encodeURIComponent(
              option
            )}`,
          })),
        },
      };
      break;

    case 3: // 3: 複数選択
      // 複数選択はQuick Replyで表現するのが一般的
      message = {
        type: "text",
        text: question.content,
        quickReply: {
          items: question.select.map((option: string) => ({
            type: "action",
            action: {
              type: "postback",
              label: option,
              displayText: `${option}を選択しました`,
              data: `action=answer&scholarshipId=${scholarshipId}&questionId=${questionId}&value=${encodeURIComponent(
                option
              )}`,
            },
          })),
        },
      };
      break;

    default: // 不明なタイプ
      message = { type: "text", text: "エラー：不明な質問タイプです。" };
      break;
  }
  await sendLineReply(replyToken, [message]);
}

export async function handleAnswerFlow(
  replyToken: string,
  userId: string,
  scholarshipId: string,
  questionId: string,
  answer: string
) {
  const stateRef = db.collection("state").doc(`${userId}_${scholarshipId}`);
  const stateDoc = await stateRef.get();

  if (!stateDoc.exists) {
    // stateがない場合はエラー（ありえないはず）
    return await sendLineReply(replyToken, [
      {
        type: "text",
        text: "エラーが発生しました。もう一度最初からお試しください。",
      },
    ]);
  }

  // 1. 回答をFirestoreに保存
  // 'answers' フィールドに、質問IDと回答のマップを保存
  await stateRef.update({
    [`answers.${questionId}`]: answer,
  });

  const updatedStateDoc = await stateRef.get();
  if (updatedStateDoc.exists) {
    console.log(
      "【データ保存後のstate】:",
      JSON.stringify(updatedStateDoc.data(), null, 2)
    );
  }

  // 2. 次の質問IDを計算
  const currentQuestionId = parseInt(questionId, 10);
  const nextQuestionId = (currentQuestionId + 1).toString();

  // 3. 次の質問をFirestoreから取得
  const nextQuestionRef = db
    .collection("scholarships")
    .doc(scholarshipId)
    .collection("question")
    .doc(nextQuestionId);

  const nextQuestionDoc = await nextQuestionRef.get();

  if (nextQuestionDoc.exists) {
    const nextQuestionData = nextQuestionDoc.data();
    await sendQuestion(replyToken, scholarshipId, nextQuestionDoc);
    // stateを次の質問IDに更新
    await stateRef.update({
      currentQuestionId: nextQuestionId,
      expectedAnswerType: nextQuestionData.type,
    });
  } else {
    await completeApplicationFlow(replyToken, userId, scholarshipId);
  }
}
