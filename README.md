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
