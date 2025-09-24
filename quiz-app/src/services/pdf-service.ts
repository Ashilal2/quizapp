import PDFDocument from "pdfkit";
import * as fs from "fs";
import { Storage } from "@google-cloud/storage";
import { db } from "../firebase";

const storage = new Storage();
const bucketName = process.env.GCLOUD_STORAGE_BUCKET!; // 環境変数で設定

export async function generateScholarshipPDFAndUpload(
  userId: string,
  scholarshipId: string
): Promise<string> {
  const userDoc = await db.collection("user").doc(userId).get();
  const userData = userDoc.data();

  const scholarshipDoc = await db
    .collection("scholarships")
    .doc(scholarshipId)
    .get();
  const scholarshipData = scholarshipDoc.data();

  const doc = new PDFDocument();
  const filePath = `/tmp/${userId}_${scholarshipId}.pdf`;
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  doc.fontSize(18).text("奨学金申請書", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`氏名: ${userData?.fullName || ""}`);
  doc.text(`生年月日: ${userData?.birthday || ""}`);
  doc.text(`学校名: ${userData?.schoolName || ""}`);
  doc.moveDown();

  doc.text(`申請奨学金: ${scholarshipData?.name || ""}`);
  doc.text(`支給額: ${scholarshipData?.paidAmount || ""}`);
  doc.text(`締切日: ${scholarshipData?.deadline || ""}`);

  doc.end();

  await new Promise((resolve) => writeStream.on("finish", resolve));

  // Cloud Storage にアップロード
  const destFileName = `${userId}_${scholarshipId}.pdf`;
  await storage.bucket(bucketName).upload(filePath, {
    destination: destFileName,
    resumable: false,
    public: true, // 公開リンクを作る
  });

  // 公開 URL を返す
  return `https://storage.googleapis.com/${bucketName}/${destFileName}`;
}
