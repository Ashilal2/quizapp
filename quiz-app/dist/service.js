"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.goodbyeWorld = exports.helloWorld = void 0;
exports.sendLineReply = sendLineReply;
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const db = admin.firestore();
// メソッドA
const helloWorld = async (req, res) => {
    console.log("Hello from Method A!");
};
exports.helloWorld = helloWorld;
// メソッドB
const goodbyeWorld = (req, res) => {
    console.log("Hello from Method B!");
};
exports.goodbyeWorld = goodbyeWorld;
// export async function handleScholarshipMenuFromFirestore(): Promise<any[]> {
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
const TOKEN = process.env.LINE_ACCESS_TOKEN;
const LINE_REPLY_ENDPOINT = "https://api.line.me/v2/bot/message/reply";
const HEADERS = {
    "Content-Type": "application/json; charset=UTF-8",
    Authorization: `Bearer ${TOKEN}`,
};
async function sendLineReply(replyToken, messages) {
    const postData = { replyToken, messages };
    const response = await (0, node_fetch_1.default)(LINE_REPLY_ENDPOINT, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(postData),
    });
    const text = await response.text();
    console.log("LINE API Response:", response.status, text);
}
