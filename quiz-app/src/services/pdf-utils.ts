// PDFを生成するだけの関数
import PDFDocument from "pdfkit";
import * as path from "path";
import * as fs from "fs";

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

    // 日本語フォントを登録（Noto Sans JPを使用）
    try {
      const fontPath = path.join(__dirname, "../fonts/NotoSansJP-Regular.ttf");
      console.log("Font path:", fontPath);

      // ファイルの存在と読み取り可能性をチェック
      if (fs.existsSync(fontPath)) {
        const stats = fs.statSync(fontPath);
        console.log("Font file size:", stats.size, "bytes");

        if (stats.size > 0) {
          // doc.registerFont("NotoSansJP", fontPath);
          // doc.font("NotoSansJP");

          doc.font(fontPath);
          console.log("日本語フォント読み込み成功");
        } else {
          throw new Error("フォントファイルのサイズが0です");
        }
      } else {
        throw new Error("フォントファイルが見つかりません");
      }
    } catch (error) {
      console.error("フォント読み込みエラー:", error.message);
      // フォントが見つからない場合はデフォルトフォントを使用
      console.warn("デフォルトフォントを使用します");
      doc.font("Helvetica");
    }

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
