# 🚀 Beginner's Guide: Launching Your App to the Web

This guide is designed for absolute beginners. Follow these steps exactly, and you'll have your app live on your resume in minutes!

---

## 🏗 Step 1: Install the Necessary Tools
Before we can put the code online, you need three free things:

1.  **Git (The "Mover")**: [Download Git for Windows here](https://git-scm.com/download/win).  
    *   *Click "Download" and run the installer. You can just click "Next" on all the default settings.*
2.  **GitHub (The "Storage")**: [Create a free account here](https://github.com/signup).
3.  **Vercel (The "Host")**: [Create a free account here](https://vercel.com/signup).  
    *   *Choose **"Continue with GitHub"**—it makes everything much easier later!*

---

## 📂 Step 2: Prepare Your Code (On Your Computer)
Once Git is installed, let's turn your folder into a "Repository" (a project Git can track).

1.  Open your **Start Menu**, search for **"Git Bash"**, and open it.
2.  In the dark window that appears, copy and paste this command then press **Enter**:
    ```bash
    cd "c:/Users/68784/OneDrive - Bain/Hobbies/PM/AoB/aob"
    ```
3.  Now, copy and paste this **entire block** at once and press **Enter**:
    ```bash
    git init
    git add .
    git commit -m "feat: finalize unified frontend and social UI"
    ```
    *(You might see a message asking for your email/name. If so, follow the instructions it gives you, then try the commit command again.)*

---

## ☁️ Step 3: Put Your Code on GitHub
1.  Go to [github.com/new](https://github.com/new).
2.  **Repository name**: Type `aob-frontend`.
3.  Leave everything else as-is and click the green **"Create repository"** button.
4.  You will see a section called **"…or push an existing repository from the command line"**. 
5.  **Copy the code** from that section on your screen, which looks like this (but with your username):
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/aob-frontend.git
    git branch -M main
    git push -u origin main
    ```
6.  Paste it into your **Git Bash** window and press **Enter**. Your code is now safely on GitHub!

---

## 🚀 Step 4: Make it Live on Vercel
1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click the blue **"Add New..."** button and select **"Project"**.
3.  You will see your `aob-frontend` project listed. Click **"Import"**.
4.  **The Important Part**: Scroll down to **"Environment Variables"**. You need to add two keys so the app can fetch books:
    *   **Key 1**: In the first box (Key), type: `NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY`  
        In the second box (Value), paste your API key from your `.env.local` file.
    *   **Key 2**: In the first box (Key), type: `NEXT_PUBLIC_NYT_API_KEY`  
        In the second box (Value), paste the NYT key from your `.env.local` file.
5.  Click the blue **"Deploy"** button.
6.  Wait about 60 seconds... **You're live!** Vercel will give you a link to share on your resume.

---

## 💡 Pro Tip
If you ever change your code and want to update the live site, just run these "Big Three" commands in Git Bash:
```bash
git add .
git commit -m "Small update"
git push
```
Vercel will see the change and update your website automatically!
