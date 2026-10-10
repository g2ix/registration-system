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

`NEXTAUTH_URL` must match the address you type in the browser. Use `http://localhost:3000` when only this computer opens the app. When phones or other computers on the same network will open it, use the steps in [Connect from another device](#connect-from-another-device) and set `NEXTAUTH_URL` to `http://<this-machine-ip>:3000`.

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
| `manager` | `manager123` | Manager |
| `election` | `election123` | Election |

Change these passwords after the first login under **Admin → User Management**.

Member lists are not part of the clone. Upload them after login with **Upload Members**.

## Start the app

Development, with live reload:

```powershell
npm run dev
```

Open `http://localhost:3000` on this computer. Stop the server with `Ctrl + C`.

Production, for an event or when other devices will connect:

```powershell
npm run build
npm start
```

`npm run dev` and `npm start` both listen on every network address of this computer, so another device can reach the app. Rebuild with `npm run build` only after the code changes. Day-to-day work on this computer alone can stay on `npm run dev`.

If port 3000 is already taken:

```powershell
npx next dev --turbopack -H 0.0.0.0 -p 3001
```

Then open `http://localhost:3001` and set `NEXTAUTH_URL` in `.env` to that same address before starting the server. For a production server on 3001, use `npm run start:3001` after `npm run build`.

## Connect from another device

Phones, laptops, and the projector computer must be on the same Wi-Fi or the same wired network as this PC. Guest Wi-Fi often blocks devices from seeing each other.

### 1. Find this computer’s address

In PowerShell on the computer that runs the app:

```powershell
ipconfig
```

Use the **IPv4 Address** on the adapter that is connected (Wi-Fi or Ethernet). It usually looks like `192.168.1.20` or `10.0.0.8`. Ignore `127.0.0.1`.

### 2. Point login at that address

In `.env`, set `NEXTAUTH_URL` to the same address and port, for example:

```env
NEXTAUTH_URL="http://192.168.1.20:3000"
```

Use the IPv4 address from step 1. Stop the server with `Ctrl + C`, then start it again. After this change, open the app with that address on every device, including this computer. `http://localhost:3000` will no longer match the login setting.

If Windows gives this PC a new IPv4 address later, update `NEXTAUTH_URL` and restart the server.

### 3. Allow the app through Windows Firewall

The first time another device connects, Windows may ask to allow Node.js on private networks. Choose **Private networks**.

If nothing asks and other devices cannot connect, run PowerShell **as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "USCCMPC Attendance" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

Use port `3001` in that command if the app is running on 3001. The network should be set to **Private** in Windows network settings. A Public network profile blocks this rule.

### 4. Open the app on the other device

Start the server on this computer (`npm start` for an event, or `npm run dev` while you are still changing the app). On the other device, open:

```text
http://192.168.1.20:3000
```

Replace that example with the IPv4 address from step 1. Sign in with the same accounts as on this computer. The raffle page, attendance page, and dashboard are the same session data, because they all use this computer’s database.

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
| Another device cannot open the page | Same Wi-Fi or cable, Windows network set to Private, firewall allows port 3000, and the address is `http://<IPv4>:3000` |
| Another device signs in and returns to login | Set `NEXTAUTH_URL` to `http://<IPv4>:3000`, restart the server, and open that same address |
| Database is locked | Only one `npm run dev` or `npm start` process should use this database at a time |
