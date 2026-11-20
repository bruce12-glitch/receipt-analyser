# Shoebox

Shoebox is a browser-based receipt checker and expense calculator. There is no database, no login, and nothing saved in the background. Everything stays in your open browser tab, and closing the tab clears your data.

## What this app is for

People usually end up with a messy mix of paper receipt photos, emailed flight confirmations, Uber summaries, and quick notes after a work trip, client project, or group getaway. Opening a full accounting tool or signing up for an expense tracker just to add up 10 receipts is overkill, and most people do not want to store personal receipts in a third-party database.

Shoebox is meant for quick, one-off cleanup whenever you need it:

- Turning a stack of receipts or pasted email confirmations into a single CSV you can attach to an expense report.
- Checking the math on restaurant slips where someone wrote a tip by hand and added the total wrong.
- Catching duplicate charges when the same purchase shows up once as a photo and once as an email receipt.
- Keeping foreign currency receipts (like JPY or EUR) separated from your home currency until you type in an exchange rate.
- Splitting a shared trip or dinner evenly across a group down to the exact cent and copying a short text summary for Slack or email.
- Adding up Sales Tax, VAT, or GST across a batch of receipts and spotting invoices missing a merchant Tax ID.

## How you put receipts in

You can use whichever format you have on hand:

- Paste a full email receipt, several receipts separated by `---`, or a simple list like `Blue Bottle Coffee $14.50` and `Uber to Airport $38.20 2026-11-12`.
- Drop JPG, PNG, WebP, HEIC, PDF, `.txt`, or saved `.json` files onto the page. Camera EXIF metadata is stripped inside your browser.
- Type a receipt in by hand if you just have a paper slip next to your keyboard.
- Load the built-in 7-receipt sample pile to test the views before using your own files.

If you want to pause and come back later, download a JSON backup file to your computer and drop it back in next time. When you finish, download a CSV or print the summary.

## Running locally

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000`.

Every feature works locally without any API keys or backend setup. If you also want automatic text extraction from uploaded photos while running the local Node server, copy `.env.example` to `.env` and set `GEMINI_API_KEY`. On static hosting (like GitHub Pages), uploaded photos open directly in the side-by-side editor so you can type or adjust the numbers right next to the image.

## Deploying to GitHub Pages

Vite is configured with relative asset paths (`base: './'` in `vite.config.ts`) so the built app works directly under `https://<your-username>.github.io/<repo-name>/`:

1. Open your repository **Settings -> Pages**.
2. Under **Build and deployment -> Source**, choose **Deploy from a branch**, select the `gh-pages` branch and `/ (root)`, and click **Save**.
3. Wait about a minute for GitHub Pages to publish the site.

To rebuild the static bundle locally at any time, run `npm run build` (outputs to `dist/`).

## Project commands

- `npm run dev` starts the local development server on port 3000.
- `npm test` runs the unit tests for cent math, duplicate checks, text parsing, and bill splitting.
- `npm run lint` runs TypeScript type checking.
- `npm run build` creates the static production bundle in `dist/`.

## License

Apache-2.0
