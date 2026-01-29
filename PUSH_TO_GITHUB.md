# Project naar GitHub pushen

De eerste commit staat lokaal klaar. Volg deze stappen om naar GitHub te pushen:

## 1. Nieuwe repository op GitHub aanmaken

1. Ga naar [github.com/new](https://github.com/new)
2. Kies een naam (bijv. `tms-system` of `TMS-System`)
3. Kies **Public** (of Private)
4. **Vink NIET aan:** "Add a README file" (je hebt al code)
5. Klik op **Create repository**

## 2. Remote toevoegen en pushen

Vervang `JOUW-GEBRUIKERSNAAM` en `JOUW-REPO-NAAM` door je eigen GitHub-gebruikersnaam en repo-naam:

```powershell
cd "c:\Projects\TMS System"
git remote add origin https://github.com/JOUW-GEBRUIKERSNAAM/JOUW-REPO-NAAM.git
git branch -M main
git push -u origin main
```

**Voorbeeld:** als je repo `https://github.com/jansen/tms-system` heet:

```powershell
git remote add origin https://github.com/jansen/tms-system.git
git branch -M main
git push -u origin main
```

## 3. Inloggen

Bij de eerste `git push` wordt om je GitHub-gebruikersnaam en wachtwoord gevraagd. Gebruik voor het wachtwoord een **Personal Access Token** (niet je gewone wachtwoord):

- GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Geef de token o.a. de scope `repo`
- Gebruik die token als wachtwoord bij `git push`

---

**Let op:** `.env` en `.env.api` staan in `.gitignore` en worden niet meegestuurd (goed voor API-keys). Zet je keys op de server of in GitHub Secrets.
