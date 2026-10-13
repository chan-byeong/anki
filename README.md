# Anki

An Expo project for web, iOS, and Android. The app has one blank start screen
and no application features yet.

## Development

Use Node.js 24 and pnpm 10.8.0. With nvm installed, run these commands:

```sh
nvm use
pnpm install --frozen-lockfile
pnpm start
```

Run `pnpm web` for the browser, `pnpm ios` for the iOS simulator, or
`pnpm android` for the Android emulator. Simulator commands require Xcode
or Android Studio, respectively.

## Checks

Use these commands before committing changes:

```sh
pnpm typecheck
pnpm lint
pnpm format:check
```

Run `pnpm format` to apply formatting. ESLint uses the Expo configuration;
Prettier handles formatting. VS Code is configured to format on save when
the Prettier extension is installed.

## Structure

Routes live in `src/app/`. The initial files are `_layout.tsx` for navigation
and `index.tsx` for the blank screen. TypeScript uses strict mode and `@/*`
for `src/*`. App icons and splash assets are the Expo template placeholders.

Install packages with `pnpm exec expo install <package>` to select compatible
versions. See the [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/).
