# Kimai

## Documentation

- [Kimai documentation](https://www.kimai.org/documentation/) — the upstream user and administration guide.
- [Getting started](https://www.kimai.org/documentation/getting-started.html) — customers, projects, and activities, and how they fit together.
- [Invoices](https://www.kimai.org/documentation/invoices.html) — turning recorded time into invoices and building templates.
- [REST API](https://www.kimai.org/documentation/rest-api.html) — the API reference for scripting and integrations.

## What you get on StartOS

Kimai and its database run together as one service — there is nothing separate to install or connect. The package exposes a single web interface serving both Kimai's UI and its REST API, generates the initial super-admin for you, and can route Kimai's outgoing email through your StartOS SMTP settings.

Your timesheets and configuration live in the database; invoices, exports, and any custom invoice or export templates you upload are kept on disk. All of it is included in StartOS backups.

## Getting set up

1. Run the **Set Admin Password** action. Kimai starts with no accounts, so StartOS asks you to do this before anything else. Copy the username and password it returns — the password is shown only once.
2. Start Kimai. The first start builds the database and applies migrations; it can take several minutes, and the Web Interface check will read as starting until it finishes.
3. Open the web interface and sign in as `admin` with the password from step 1.
4. In Kimai, open **User** → your profile and set a real email address. The account is created with a placeholder address that cannot receive mail, so password-reset emails would go nowhere.
5. Create your first customer, then a project under it, then an activity. Kimai needs all three before you can record time.

## Using Kimai

### Web interface

The first time you sign in, Kimai opens a short setup wizard that walks you through customizing it to your needs. You can step through it or skip it; it does not need to be completed for Kimai to work.

After that you land on the dashboard, where the timer at the top starts and stops recording against a project and activity. Everything else — timesheets, customers, projects, invoices, exports, reporting, and user administration — is reachable from the sidebar.

The same address also serves Kimai's REST API under `/api`. Create API access from your user profile inside Kimai.

### Set Admin Password

Generates a fresh random password for the `admin` account and shows it to you once. Use it to rotate the password later, or if you lose it. If Kimai is running it restarts to apply the change, which takes a few moments.

This only affects `admin`. Other users' passwords are managed inside Kimai.

### Configure SMTP

Lets Kimai send email — password resets, invoices, and scheduled reports. Choose your StartOS system SMTP settings or enter a custom provider. Until you do, the Email health check reads as disabled and those features silently do nothing.

## Limitations

The `admin` account is created with a placeholder email address (`admin@kimai.local`) that cannot receive mail. Change it in Kimai before relying on password-reset emails.
