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
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.dev" });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const admin = __importStar(require("firebase-admin"));
const mapType = (raw) => {
    if (typeof raw === "number") {
        if ([1, 2, 3, 4].includes(raw))
            return raw;
    }
    else if (typeof raw === "string") {
        const m = {
            text: 1,
            binary: 2,
            multiple: 3,
            single: 4,
        };
        if (m[raw])
            return m[raw];
    }
    throw new Error(`Unsupported type: ${raw}`);
};
async function main() {
    const jsonPath = process.argv[2];
    const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    if (!jsonPath) {
        console.error("Usage: ts-node scripts/import-questions.ts <path/to/questions.json>");
        process.exit(1);
    }
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    const db = admin.firestore();
    const raw = fs.readFileSync(path.resolve(jsonPath), "utf-8");
    const rows = JSON.parse(raw);
    console.log(`Project: ${projectId ?? "(not set)"}`);
    console.log(`Importing ${rows.length} scholarship(s) from ${jsonPath}`);
    const MAX_BATCH = 500;
    let batch = db.batch();
    let ops = 0;
    for (const row of rows) {
        const sid = row.scholarshipId;
        if (!sid)
            throw new Error("scholarshipId is required");
        for (const q of row.questions) {
            const qid = q.qid?.toString();
            if (!qid)
                throw new Error(`qid is required for ${sid}`);
            const type = mapType(q.type);
            const select = Array.isArray(q.select)
                ? q.select
                : Array.isArray(q.options)
                    ? q.options
                    : undefined;
            const data = {
                content: q.content,
                isRequire: !!q.isRequire,
                type, // 1..4 に正規化済み
            };
            if (select)
                data.select = select;
            if (q.format)
                data.format = q.format;
            const ref = db
                .collection("scholarships")
                .doc(sid)
                .collection("question")
                .doc(qid);
            batch.set(ref, data, { merge: true });
            ops++;
            if (ops >= MAX_BATCH) {
                await batch.commit();
                console.log(`Committed ${ops} ops`);
                batch = db.batch();
                ops = 0;
            }
        }
    }
    if (ops > 0) {
        await batch.commit();
        console.log(`Committed ${ops} ops (final)`);
    }
    console.log("Import finished.");
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
