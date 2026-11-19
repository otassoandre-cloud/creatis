import { removeBackground } from "@imgly/background-removal-node";
import fs from "fs";
const src = process.argv[2], dst = process.argv[3];
const t0 = Date.now();
const blob = await removeBackground(`file://${src}`);
const buf = Buffer.from(await blob.arrayBuffer());
fs.writeFileSync(dst, buf);
console.log(`${dst} — ${(buf.length / 1024).toFixed(0)} ko en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
