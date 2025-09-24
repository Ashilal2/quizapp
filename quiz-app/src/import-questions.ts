// import * as dotenv from "dotenv";
// dotenv.config({ path: ".env.dev" });
// import * as fs from "fs";
// import * as path from "path";
// import * as admin from "firebase-admin";

// type InputRow = {
//   scholarshipId: string;
//   questions: Array<{
//     qid: string;
//     content: string;
//     isRequire?: boolean;
//     type: number | "text" | "binary" | "multiple" | "single";
//     select?: string[];
//     options?: string[];
//     format?: string;
//   }>;
// };

// const mapType = (raw: any): 1 | 2 | 3 | 4 => {
//   if (typeof raw === "number") {
//     if ([1, 2, 3, 4].includes(raw)) return raw as 1 | 2 | 3 | 4;
//   } else if (typeof raw === "string") {
//     const m: Record<string, 1 | 2 | 3 | 4> = {
//       text: 1,
//       binary: 2,
//       multiple: 3,
//       single: 4,
//     };
//     if (m[raw]) return m[raw];
//   }
//   throw new Error(`Unsupported type: ${raw}`);
// };

// async function main() {
//   const jsonPath = process.argv[2];
//   const projectId =
//     process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

//   if (!jsonPath) {
//     console.error(
//       "Usage: ts-node scripts/import-questions.ts <path/to/questions.json>"
//     );
//     process.exit(1);
//   }

//   if (!admin.apps.length) {
//     admin.initializeApp();
//   }
//   const db = admin.firestore();

//   const raw = fs.readFileSync(path.resolve(jsonPath), "utf-8");
//   const rows: InputRow[] = JSON.parse(raw);

//   console.log(`Project: ${projectId ?? "(not set)"}`);
//   console.log(`Importing ${rows.length} scholarship(s) from ${jsonPath}`);

//   const MAX_BATCH = 500;
//   let batch = db.batch();
//   let ops = 0;

//   for (const row of rows) {
//     const sid = row.scholarshipId;
//     if (!sid) throw new Error("scholarshipId is required");

//     for (const q of row.questions) {
//       const qid = q.qid?.toString();
//       if (!qid) throw new Error(`qid is required for ${sid}`);

//       const type = mapType(q.type);
//       const select = Array.isArray(q.select)
//         ? q.select
//         : Array.isArray(q.options)
//         ? q.options
//         : undefined;

//       const data: any = {
//         content: q.content,
//         isRequire: !!q.isRequire,
//         type, // 1..4 に正規化済み
//       };
//       if (select) data.select = select;
//       if (q.format) data.format = q.format;

//       const ref = db
//         .collection("scholarships")
//         .doc(sid)
//         .collection("question")
//         .doc(qid);
//       batch.set(ref, data, { merge: true });
//       ops++;

//       if (ops >= MAX_BATCH) {
//         await batch.commit();
//         console.log(`Committed ${ops} ops`);
//         batch = db.batch();
//         ops = 0;
//       }
//     }
//   }

//   if (ops > 0) {
//     await batch.commit();
//     console.log(`Committed ${ops} ops (final)`);
//   }
//   console.log("Import finished.");
// }

// main().catch((e) => {
//   console.error(e);
//   process.exit(1);
// });
