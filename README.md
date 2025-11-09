# Rift Bound Archiver

This project is a lightweight Angular application for tracking player decks and missing cards. The sections below explain how to run the site locally for development and how to publish it with GitHub Pages.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later (comes with npm)
- [Angular CLI](https://angular.dev/tools/cli) installed globally: `npm install -g @angular/cli`

## Run locally for testing

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Open your browser to `http://localhost:4200/` to view the app. The CLI reloads the page whenever you save changes.

## Deploy to GitHub Pages

1. Build the project for production, configuring the GitHub Pages base URL and emitting the files into a `docs/` folder (GitHub Pages can serve static sites from this folder on the default branch):
   ```bash
   ng build --configuration production --base-href "/<repository-name>/" --output-path docs
   ```
   Replace `<repository-name>` with the name of your GitHub repository.

2. Commit the generated `docs/` folder and push it to the repository's default branch (usually `main`).

3. In your repository settings on GitHub, open **Pages** and select **Deploy from a branch**. Choose the default branch and set the folder to `/docs`.

4. Save the settings. After GitHub finishes building the site, your app will be live at `https://<username>.github.io/<repository-name>/`.

### Optional: dedicated deployment branch

If you prefer to publish from a `gh-pages` branch instead of `/docs`, you can run:

```bash
ng build --configuration production --base-href "https://<username>.github.io/<repository-name>/"
git subtree push --prefix dist/rift-bound-archiver/browser origin gh-pages
```

Then configure GitHub Pages to serve from the `gh-pages` branch.

## Troubleshooting

- If `npm install` fails with registry access errors, ensure you have network access to npm or configure a proxy.
- For GitHub Pages, double-check the `--base-href` value. It must match your repository path so that routing works when the page is served from a subdirectory.

