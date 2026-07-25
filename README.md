This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This project uses [Bun](https://bun.sh) as its package manager and runtime.

Install dependencies and run the development server:

```bash
bun install
bun dev
```

Other scripts:

```bash
bun run build      # production build
bun start          # serve the production build
bun run lint       # eslint
bun run typecheck  # tsc --noEmit
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Run with Docker

```bash
docker compose up -d --build
```

เปิด [http://localhost:3000](http://localhost:3000)

ฐานข้อมูล sqlite ถูกเก็บใน **named volume** `app-question-data` ที่ mount ไว้ที่ `/app/data`
ลบ/สร้าง container ใหม่ข้อมูลยังอยู่ครบ — ทั้งข้อความแชท ชุดคำถามที่ generate ไว้ และการตั้งค่า AI (รวม API Key)

```bash
docker compose down          # หยุด แต่ volume ยังอยู่
docker compose down -v       # ลบ volume ด้วย = ล้างข้อมูลทั้งหมด
docker volume inspect app-question-data
```

สำรอง / กู้คืนข้อมูล:

```bash
# backup
docker run --rm -v app-question-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/app-question-data.tar.gz -C /data .

# restore
docker run --rm -v app-question-data:/data -v "$PWD":/backup alpine \
  tar xzf /backup/app-question-data.tar.gz -C /data
```

ถ้าอยากใช้ `docker run` ตรงๆ แทน compose:

```bash
docker build -t app-question .
docker run -d --name app-question -p 3000:3000 \
  -v app-question-data:/app/data app-question
```

หรือจะ bind mount โฟลเดอร์บนเครื่องก็ได้ (ต้องให้ uid 1001 เขียนได้):

```bash
mkdir -p ./data && sudo chown -R 1001:1001 ./data
docker run -d -p 3000:3000 -v "$PWD/data":/app/data app-question
```

ตัวแปรแวดล้อมที่เกี่ยวข้อง:

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
| --- | --- | --- |
| `CHAT_DB_PATH` | `/app/data/chat.sqlite` (ใน Docker) | ที่อยู่ไฟล์ sqlite — โฟลเดอร์จะถูกสร้างให้อัตโนมัติ |
| `AI_API_KEY` | – | API Key เริ่มต้น ใช้เมื่อยังไม่เคยตั้งค่าในแอป |

## Chat architecture

Single shared room, multiple participants:

- `app/api/messages` — `GET` history (last 100), `POST` a new message
- `app/api/stream` — SSE stream (`text/event-stream`) broadcasting `message` and `presence` events
- `app/lib/db.ts` — persistence via `bun:sqlite` (`CHAT_DB_PATH`, defaults to `./chat.sqlite`, `/app/data/chat.sqlite` ใน Docker)
- `app/lib/bus.ts` — in-process pub/sub connecting POST → all open streams

Identity is client-side: the display name lives in `localStorage` (`chat:userName`) along with a
stable `chat:clientId` used to tell participants apart even when they pick the same name.

Because the pub/sub hub is in-process, run a **single instance**. Scaling horizontally would
require an external broker (Redis pub/sub, Postgres LISTEN/NOTIFY, etc.).

Fonts are loaded via [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) (Noto Sans Thai).

## AI Quiz

ปุ่ม `+` หน้าช่องพิมพ์เปิดเมนู 2 อย่าง: **ตั้งค่า AI** และ **Generate คำถาม**

- `app/lib/ai.ts` — เรียกโมเดลผ่าน OpenAI / OpenRouter / Anthropic / Google Gemini แล้ว parse JSON ออกมาเป็นข้อสอบปรนัย
- `app/lib/quiz.ts` — เอนจินควิซในหน่วยความจำ (timer ต่อข้อ, เฉลย, ดีเลย์, auto-next, คะแนน) กระจายสถานะผ่าน SSE เหมือนข้อความแชท
- `app/api/ai/settings` — `GET`/`PUT` การตั้งค่า (provider, model, base URL, เวลาต่อข้อ, ดีเลย์, auto-next) — API Key เก็บใน sqlite ฝั่งเซิร์ฟเวอร์และไม่ถูกส่งกลับมาที่เบราว์เซอร์ (ตั้งค่าเริ่มต้นจาก `AI_API_KEY` ได้)
- `app/api/ai/generate` — สร้างคำถามทั้งชุดล่วงหน้า แล้วบันทึกลงตาราง `question_sets` / `questions`
- `app/api/question-sets` — รายการชุดคำถามที่เก็บไว้ (เล่นซ้ำได้ ไม่ต้อง generate ใหม่)
- `app/api/quiz` — `start` / `answer` / `skip` / `next` / `stop`

ระหว่างเล่น: กดตัวเลือกในการ์ดควิซ หรือพิมพ์ `A`–`D` (หรือ `1`–`4`) ในช่องแชทก็ตอบได้

จังหวะของแต่ละข้อ:

`asking` (รอจนทุกคนในห้องตอบครบ หรือหมดเวลาต่อข้อ) → `prereveal` (หน่วงตามค่าดีเลย์)
→ `reveal` (โชว์เฉลย คำอธิบาย และคำตอบของทุกคนพร้อมคะแนนที่ได้ ค้างไว้เท่าค่าดีเลย์) → ข้อถัดไป

คะแนนคิดจากความเร็ว + โบนัสคนตอบถูกคนแรก + streak และสรุป leaderboard ตอนจบ

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
