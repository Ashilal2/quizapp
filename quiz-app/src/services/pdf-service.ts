// Firestoreから回答集めて → PDF生成 → Storage保存 → LINE送信
import { db } from "../firebase";
import { Storage } from "@google-cloud/storage";
import { createPDFBuffer } from "./pdf-utils";
import { sendLinePush } from "./line-service";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.dev" });

const storage = new Storage();
const bucketName = process.env.GCLOUD_STORAGE_BUCKET!;

// 確認
console.log("こここここここここここk");
console.log("Using bucket:", bucketName);

export async function generateScholarshipPDFAndUpload(
  userId: string,
  scholarshipId: string
) {
  // Firestoreのstateから回答を取得
  const stateDoc = await db
    .collection("state")
    .doc(`${userId}_${scholarshipId}`)
    .get();
  if (!stateDoc.exists) {
    console.error("回答データがありません");
    return;
  }
  const answers = stateDoc.data()?.answers || {};

  // 奨学金情報
  const scholarshipDoc = await db
    .collection("scholarships")
    .doc(scholarshipId)
    .get();
  const scholarship = scholarshipDoc.data();

  // PDF生成前に質問一覧を取る
  const questionSnapshot = await db
    .collection("scholarships")
    .doc(scholarshipId)
    .collection("question")
    .get();

  const qas = questionSnapshot.docs.map((doc) => {
    const q = doc.data();
    return {
      question: q.content, // ← Firestoreの質問文を使う
      answer: answers[doc.id] || "未回答", // ← 回答が無ければ「未回答」
    };
  });

  // PDF生成
  const pdfBuffer = await createPDFBuffer(
    scholarship?.name || "奨学金申請書",
    qas
  );

  // // PDF生成
  // const pdfBuffer = await createPDFBuffer(
  //   scholarship?.name || "奨学金申請書",
  //   Object.entries(answers).map(([qId, ans]) => ({
  //     question: qId, // Firestoreから取った回答をそのままdoc.id（数字のID文字列）で出で出すと英数字の羅列になる。
  //     answer: ans as string,
  //   }))
  // );

  // 保存先ファイル名
  const fileName = `applications/${userId}_${scholarshipId}.pdf`;
  const file = storage.bucket(bucketName).file(fileName);

  // PDFをアップロード
  await file.save(pdfBuffer, { contentType: "application/pdf" });

  // 署名付きURLを発行（24時間有効）
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24時間
  });

  // LINEに送信
  await sendLinePush(userId, [
    {
      type: "text",
      text: "申請PDFを作成しました！こちらからダウンロードできます（24時間有効）",
    },
    {
      type: "text",
      text: url, // 署名付きURLをそのまま送る
    },
  ]);
}
