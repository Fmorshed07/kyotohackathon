# IMPACT KYOTO 2026

## Project info

A hackathon website for IMPACT KYOTO 2026 - AI for Global Good.

## How can I edit this code?

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

You can deploy this project using any static hosting service such as Vercel, Netlify, or GitHub Pages.

## Import a hosted event from Luma

In the host dashboard, choose **Import from Luma**, paste a `https://luma.com/<event>` or `https://lu.ma/<event>` link, and select **Extract details**. Review the preview and select **Use details in new draft**. The brief stays editable and uses the site's blue theme; the imported Luma link becomes the registration link. Create the draft and publish it using the existing host controls.

The importer reads public page data for the description, dates, location, cover, organizer, gallery, and any explicitly provided programme, participation rules, prizes, and performers. Hidden locations, private guest details, and unpublished fields cannot be imported; missing fields are left empty for the host to fill. Dates are converted to the host browser's local time without changing the event's actual start/end time.

The authenticated `/api/luma-event-import` endpoint runs both in the Vite dev server and as a Vercel function. No Luma API key or AI configuration is required. Static-only deployments need a server for this API endpoint.

## Homepage event previews

The homepage previews up to three published events whose exact `startAt` and `endAt` timestamps include the current time. The selected event fills the available width, stacks on mobile, and keeps its complete poster visible. Previews update automatically at the start and end, display the event timezone when available, and link to the event details. If nothing is live, the next dated events appear as **Upcoming**.

Finished events appear in a separate **Past events** card section with registration closed and archive links. Published events explicitly marked **Past** remain eligible even without exact timestamps; their original display dates are shown. The public catalog controls visibility, cloud records take priority, and legacy Tokyo/Dhaka cards use their existing official archive URLs.

Host publishing saves exact timestamps. Older host listings need to be saved or republished once with both dates to enter the live/upcoming previews. Manually setting **Live** does not override the homepage's date check.

The **Get Hired** section includes one responsive Peer Portal website embed and a direct link to the full site. Peer Portal's deployed website currently sends `X-Frame-Options: SAMEORIGIN` and `Content-Security-Policy: frame-ancestors 'self'`, which block cross-origin embedding. The inline preview depends on deployment of Peer Portal's approved homepage framing policy; until then, use **Open live preview** to open the official website in a new tab.

## AI event builder

Admins can open the Admin Dashboard and use **AI event builder** to paste an event brief plus an optional rulebook URL. One action generates the public event page, schedule, requirements, and judging criteria, then publishes the event at `/events/<event-id>` on the same deployment.

Set this server-only environment variable in the deployment that serves the API routes (for Vercel: Project Settings → Environment Variables), then redeploy:

```sh
OPENAI_API_KEY=your_api_key
```

Optional: set `OPENAI_HACKATHON_MODEL` to a supported OpenAI Chat Completions model (default `gpt-5.6-luna`). Admins can also pick from the latest models in the AI event builder UI (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.5`, `gpt-5.4-mini`, `gpt-4.1`, and more). Do **not** use a `VITE_` prefix for either value; that would expose the key to browser users.

Deploy the updated Firestore rules before using the builder in production:

```sh
firebase deploy --only firestore:rules
```
