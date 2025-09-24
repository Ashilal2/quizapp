// 回答処理

import { db } from "../firebase";
import { sendLineReply } from "./line-service";
import { sendQuestion } from "./question-service";

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
    return await sendLineReply(replyToken, [
      {
        type: "text",
        text: "エラーが発生しました。もう一度最初からお試しください。",
      },
    ]);
  }

  await stateRef.update({ [`answers.${questionId}`]: answer });

  const currentQuestionId = parseInt(questionId, 10);
  const nextQuestionId = (currentQuestionId + 1).toString();
  const nextQuestionDoc = await db
    .collection("scholarships")
    .doc(scholarshipId)
    .collection("question")
    .doc(nextQuestionId)
    .get();

  if (nextQuestionDoc.exists) {
    await sendQuestion(replyToken, scholarshipId, nextQuestionDoc, []);
    await stateRef.update({
      currentQuestionId: nextQuestionId,
      expectedAnswerType: nextQuestionDoc.data()?.type,
    });
  } else {
    await completeApplicationFlow(replyToken, userId, scholarshipId);
  }
}

// 申請完了時の処理を行う関数
export async function completeApplicationFlow(
  replyToken: string,
  userId: string,
  scholarshipId: string
) {
  await sendLineReply(replyToken, [
    {
      type: "text",
      text: "お疲れ様でした。以上で質問は終了です。ご回答ありがとうございました！",
    },
  ]);
  // stateを削除または完了済みに更新
  await db.collection("state").doc(`${userId}_${scholarshipId}`).update({
    isSuspend: true, // 完了フラグ
  });
}
