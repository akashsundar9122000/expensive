# ExpenseTracker

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.17.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Google Sign-In Setup

The login page supports Google Sign-In using Google Identity Services.

### 1) Create OAuth Client in Google Cloud

1. Open https://console.cloud.google.com/
2. Create/select a project.
3. Go to **APIs & Services → OAuth consent screen** and configure the app.
4. Go to **APIs & Services → Credentials**.
5. Click **Create Credentials → OAuth client ID**.
6. Choose **Web application**.
7. Add these JavaScript origins:
	 - `http://localhost:4200`
	 - your production frontend URL (if deployed)
8. Copy the generated **Client ID**.

### 2) Add Client ID to Angular Environment

Set `googleClientId` in:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Example:

```ts
export const environment = {
	production: false,
	apiUrl: '',
	googleClientId: 'YOUR_GOOGLE_CLIENT_ID'
};
```

### 3) Start the App

Run:

```bash
ng serve
```

Then open `http://localhost:4200/login` and click **Sign in with Google**.

### Notes

- If `googleClientId` is empty, the app shows “Google sign-in is not configured yet.”
- The backend verifies Google token info and then logs in (or auto-creates) the user.
