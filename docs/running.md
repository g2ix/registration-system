# Running the project

This guide covers a fresh clone, starting the app again on a machine that is already set up, and opening the database in Prisma Studio.

A clone does not include installed packages, the `.env` file, or the SQLite database. Those are created on each machine.

## Before you run it

Install these once:

- [Node.js LTS v20 or newer](https://nodejs.org)
- [Git](https://git-scm.com)

Check the versions in PowerShell:

```powershell
node -v
npm -v
```

`node -v` should print v20 or higher.

## First run after cloning

Open PowerShell in the project folder, then run these steps in order.

### 1. Install packages

```powershell
npm install
```

### 2. Create the environment file

```powershell
copy .env.example .env
```

Generate a secret:

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

Paste that value into `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="pasteTheGeneratedSecretHere"
NEXTAUTH_URL="http://localhost:3000"
```

`NEXTAUTH_URL` must match the address you open in the browser. Use `http://localhost:3000` on this machine. If other devices on the network will open the app, set this to `http://<this-machine-ip>:3000` instead.

If you change `.env` while the server is already running, stop it with `Ctrl + C` and start it again. Otherwise login can succeed and then send you back to the login page.

### 3. Create the database and default accounts

```powershell
npx prisma db push
npm run db:seed
```

`npx prisma db push` creates `prisma/dev.db` from the Prisma schema. `npm run db:seed` adds the login accounts and the default event title.

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `staff` | `staff123` | Staff |
| `election` | `election123` | Election |

Change these passwords after the first login under **Admin → User Management**.

Member lists are not part of the clone. Upload them after login with **Upload Members**.

## Start the app

Development, with live reload:

```powershell
npm run dev
```

Open `http://localhost:3000`.

Other devices on the same network can use `http://<this-machine-ip>:3000`. Find that address with:

```powershell
ipconfig
```

Look for **IPv4 Address** on the active network adapter.

Stop the server with `Ctrl + C`.

Production, after the app is already built:

```powershell
npm run build
npm start
```

Use production when the app will stay running for an event. Rebuild with `npm run build` only after the code changes. Day-to-day development can stay on `npm run dev`.

If port 3000 is already taken:

```powershell
npx next dev -H 0.0.0.0 -p 3001
```

Then open `http://localhost:3001` and set `NEXTAUTH_URL` in `.env` to that same address before starting the server.

## Run it again later

On a machine that already has `.env`, installed packages, and `prisma/dev.db`:

```powershell
cd registration-system
npm run dev
```

You do not need to install, copy `.env`, or seed again.

After pulling newer code onto that same machine:

```powershell
git pull
npm install
npx prisma db push
npm run dev
```

Run `npm run db:seed` again only if the database was deleted. Seeding again does not reset passwords that were already changed.

## Open the database with Prisma

Prisma Studio is a local browser view of `prisma/dev.db`. It shows `User`, `Member`, `Attendance`, and the other tables.

Start the app in one terminal, then open a second terminal in the same project folder:

```powershell
npm run db:studio
```

Open `http://localhost:5555`. Leave that terminal open while you browse the data, and stop Studio with `Ctrl + C`. Studio uses port 5555, so it can run at the same time as the app on port 3000.

The database file itself is `prisma/dev.db`. It is created on this machine and is not committed to git.

## If login fails

| What you see | What to do |
|--------------|------------|
| Invalid username or password | Run `npm run db:seed`, then sign in with `admin` / `admin123` |
| Sign-in succeeds, then the page returns to login | Stop the server and start `npm run dev` again so it reloads `.env` |
| `NEXTAUTH_SECRET` error | Confirm `.env` exists and `NEXTAUTH_SECRET` is filled in |
| Port 3000 already in use | Stop the other server, or start this one on port 3001 |
| Database is locked | Only one `npm run dev` or `npm start` process should use this database at a time |
