// PDFを生成するだけの関数
import PDFDocument from "pdfkit";

export async function createPDFBuffer(
  title: string,
  qas: { question: string; answer: string }[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: any[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // タイトル
    doc.fontSize(20).text(title, { align: "center" });
    doc.moveDown();

    // 質問と回答を1つずつ出力
    qas.forEach((qa, i) => {
      doc.fontSize(12).text(`${i + 1}. ${qa.question}`);
      doc.fontSize(12).text(`回答: ${qa.answer}`);
      doc.moveDown();
    });

    doc.end();
  });
}
