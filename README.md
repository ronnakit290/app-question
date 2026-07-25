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

Build and start the production image:

```bash
docker build -t app-question .
docker run --rm -p 3000:3000 app-question
```

Open [http://localhost:3000](http://localhost:3000) after the container starts.

The container stores the chat database in the `/app/data` volume:

```bash
docker run --rm -p 3000:3000 -v app-question-data:/app/data app-question
```

## Chat architecture

Single shared room, multiple participants:

- `app/api/messages` — `GET` history (last 100), `POST` a new message
- `app/api/stream` — SSE stream (`text/event-stream`) broadcasting `message` and `presence` events
- `app/lib/db.ts` — persistence via `bun:sqlite` (`CHAT_DB_PATH`, defaults to `./chat.sqlite`)
- `app/lib/bus.ts` — in-process pub/sub connecting POST → all open streams

Identity is client-side: the display name lives in `localStorage` (`chat:userName`) along with a
stable `chat:clientId` used to tell participants apart even when they pick the same name.

Because the pub/sub hub is in-process, run a **single instance**. Scaling horizontally would
require an external broker (Redis pub/sub, Postgres LISTEN/NOTIFY, etc.).

Fonts are loaded via [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) (Noto Sans Thai).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
