// 奨学金関連のメニュー処理

import { db } from "../firebase";

export async function handleScholarshipMenuFromFirestore(): Promise<any[]> {
  const citiesRef = db.collection("scholarships");
  const snapshot = await citiesRef.where("type", "array-contains", "2").get();

  console.log(snapshot.docs);

  if (snapshot.empty) {
    return [
      {
        type: "text",
        text: "現在、表示できる奨学金はありません。",
      },
    ];
  }
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
          uri: "https://example.com/scholarship/" + doc.id,
        },
        {
          type: "postback",
          label: "申請を始める",
          data: `action=startApply&scholarshipId=${doc.id}`,
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

export function handleRequiredDocuments() {
  return [
    {
      type: "text",
      text: "必要書類のご案内です。\n1. 住民票\n2. 所得証明書\n3. 成績証明書\n...",
    },
  ];
}

export function handleDefaultReply(userMessage: string) {
  return [
    {
      type: "text",
      text: `「${userMessage}」ですね。`,
    },
  ];
}
