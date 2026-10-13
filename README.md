# 🚀 College DevOps & Cloud Lab — Student Starter Kit

> **Ye starter kit Anis ke `Ajay-Traders` jaise fullstack web applications ko deploy karne ke liye design kiya gaya hai.**  
> Isme Backend (Node/Express), Frontend (React/Vite/Nginx), Kubernetes Manifests, aur Jenkins CI/CD Pipeline sab kuch pre-configured hai.

---

## ⚡ Quick Start — Kaise Use Karein? (2 Simple Tareeqe)

Student chahe kisi bhi situation mein ho, **sirf 1 command** se uska poora project configure ho jata hai:

```
                  ┌──────────────────────────────────────────────┐
                  │   Do You Have An Existing Project?           │
                  └───────────────┬──────────────────────────────┘
                                  │
               ┌──────────────────┴──────────────────┐
               ▼ YES                                 ▼ NO
       [ METHOD 1 ]                                  [ METHOD 2 ]
  Aapka project pehle se bana hai               Naya project start kar rahe ho
  (Backend + Frontend folders hain)             (Starter kit se start karo)
               │                                             │
  Sirf configure.js copy karo                   Starter Kit clone karo
  apne project ke root mein                     aur code paste karo
               │                                             │
               └──────────────┬──────────────────────────────┘
                              │
                              ▼ Run Command
                      node configure.js
                              │
               ┌──────────────┴──────────────────────────────┐
               ▼                                             ▼
  • Missing files auto-generate hogi:            • Saare CHANGE_ME_ values
    - Backend/Dockerfile                           automatically aapke email
    - Frontend/Dockerfile + nginx.conf             details se replace honge!
    - k8s/deployment.yaml + ingress.yaml
    - Jenkinsfile + sonar.properties + .gitignore
```

---

### 🟢 METHOD 1: Agar Aapka Project Pehle Se Bana Hua Hai (Super Easy 🌟)

Maan lo aapke laptop par pehle se project folder hai:
```
My-College-Project/
├── Backend/     (sirf code hai, koi Dockerfile nahi)
└── Frontend/    (sirf code hai, koi Dockerfile/nginx nahi)
```

1. Is starter-kit se sirf **`configure.js`** file ko apne project folder ke root mein copy karo.
2. Terminal mein run karo:
   ```bash
   node configure.js
   ```
3. Script aapse **Roll Number**, **Nexus Password**, aur **Sonar Token** poochhegi.
4. **Boom! 🪄 Script automatically ye sab create kar degi:**
   - ✅ `Backend/Dockerfile` (Node.js production image, port 5000, non-root user)
   - ✅ `Frontend/Dockerfile` (Vite/React multi-stage image + Nginx runner, port 80)
   - ✅ `Frontend/nginx.conf` (SPA routing, gzip compression, asset caching)
   - ✅ `k8s/deployment.yaml` (Backend + Frontend Deployments aur Services)
   - ✅ `k8s/ingress.yaml` (Zero-CORS routing: `/api` -> backend, `/` -> frontend)
   - ✅ `Jenkinsfile` (BuildKit + Nexus Registry push + Kubernetes auto-deploy)
   - ✅ `sonar-project.properties` (SonarQube code scan configuration)
   - ✅ `.gitignore` (Secrets leak hone se bachane ke liye)

---

### 🔵 METHOD 2: Agar Aap Starter Kit Ko Base Bana Rahe Ho

1. Is repository ko clone karo ya download karo.
2. Apna backend code `Backend/` folder mein daalo aur frontend code `Frontend/` folder mein daalo.
3. Terminal mein run karo:
   ```bash
   node configure.js
   ```
4. Apni details enter karo → Saare placeholders automatically replace ho jayenge!

---

## 🔒 Security & Environment Variables (.env Leak Se Bachna)

> ⚠️ **IMPORTANT SECURITY RULE:**  
> Kabhi bhi apna MongoDB password, JWT secret ya API keys `docker-compose.yml` ya `k8s/deployment.yaml` mein hardcode karke GitHub par push **mat karein**!

### Sahi Tareeka:
1. `Backend/` folder ke andar ek template file hai: **`Backend/.env.example`**
2. Uski copy banakar naam rakhein: **`Backend/.env`**
3. Usme apna real MongoDB connection string daalein:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://user:password@cluster0.abc.mongodb.net/mydb
   JWT_SECRET=supersecret123
   ```
4. Root par [.gitignore](file:///c:/Users/userm/Desktop/ADMIN_PANEL/student-starter-kit/.gitignore) laga hua hai, jo `.env` file ko **kabhi bhi GitHub par push nahi hone dega**.

---

## 🔑 Kaunse Values Kahan Se Aate Hain? (Email Mapping)

Admin Panel se mile Welcome Email ke hisaab se values map hoti hain:

| Placeholder | Kahan Milega? (Welcome Email) | Example |
|-------------|-------------------------------|---------|
| `Roll Number` | Student ID / Username | `24010988a` |
| `Nexus Password` | Nexus Docker Password | `W%Z%4R!eB32X` |
| `SonarQube Token` | SonarQube Token | `sqa_9767bb48496739...` |
| `Kubernetes Namespace` | Namespace (Auto: `student-<rollno>`) | `student-24010988a` |
| `Docker Registry Path` | Nexus Path (Auto: `student-docker/<rollno>`) | `student-docker/24010988a` |
| `Application Domain` | Domain (Auto: `<rollno>.imcc.skilli.in`) | `24010988a.imcc.skilli.in` |

---

## 🛠️ Deployment Steps (Sirf 4 Steps)

### STEP 1: Jenkins Credentials Banayein (2 Credentials)
Jenkins Portal: **https://jenkins.imcc.skilli.in**  
Go to: **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**

#### 1️⃣ SonarQube Token:
- **Kind:** `Secret text`
- **Secret:** Email wala Sonar token (`sqa_...`)
- **ID:** `<rollno>-sonar-token` (e.g. `24010988a-sonar-token`)

#### 2️⃣ Kubeconfig File:
- Admin Panel (**https://cicd.imcc.skilli.in**) par login karein → Profile → **"Download Kubeconfig"** dabayein.
- Jenkins par wapas aayein:
- **Kind:** `Secret file`
- **File:** Download hui `.yaml` file upload karein.
- **ID:** `<rollno>-kubeconfig` (e.g. `24010988a-kubeconfig`)

---

### STEP 2: GitHub Par Code Push Karein
GitHub par ek naya repo banayein aur apne project folder se run karein:

```bash
git init
git add .
git commit -m "feat: setup fullstack devops pipeline"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

---

### STEP 3: Jenkins Pipeline Job Banayein
1. Jenkins mein **"New Item"** click karein.
2. Name daalein (e.g. `24010988a-project`), **Pipeline** select karein → **OK**.
3. Niche scroll karein → **Pipeline**:
   - **Definition:** `Pipeline script from SCM`
   - **SCM:** `Git`
   - **Repository URL:** Aapke GitHub repo ka URL
   - **Branch:** `*/main`
   - **Script Path:** `Jenkinsfile`
4. **Save** → **"Build Now"** dabayein! 🚀

---

### STEP 4: GitHub Webhook (Auto Deploy on "git push")
Har commit par auto-deploy ke liye:
1. GitHub repo → **Settings → Webhooks → Add webhook**
2. **Payload URL:** `https://jenkins.imcc.skilli.in/github-webhook/` *(Aakhiri slash zaroori hai!)*
3. **Content type:** `application/json`
4. **Events:** `Just the push event` → **Add webhook** click karein.

---

### STEP 5: Live App Check Karein! 🎉
Pipeline complete hone ke baad browser mein open karein:

👉 **`https://<rollno>.imcc.skilli.in`**  
*(Example: `https://24010988a.imcc.skilli.in`)*

---

## 🏗️ Kubernetes Architecture & Zero-CORS Routing

```
                       [ User / Browser ]
                               │
                               ▼ https://24010988a.imcc.skilli.in
                ┌──────────────────────────────┐
                │   NGINX Ingress Controller   │
                └──────────────┬───────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼ path: /api                    ▼ path: /
    ┌─────────────────────┐         ┌─────────────────────┐
    │   backend-service   │         │  frontend-service   │
    │     (Port 5000)     │         │      (Port 80)      │
    └──────────┬──────────┘         └──────────┬──────────┘
               ▼                               ▼
    ┌─────────────────────┐         ┌─────────────────────┐
    │     Backend Pod     │         │    Frontend Pod     │
    │  (Node.js / Express)│         │   (Nginx + Vite)    │
    └─────────────────────┘         └─────────────────────┘
```

> 💡 **Zero CORS Issues:**  
> Frontend aur Backend dono **same domain** par chalte hain.  
> Frontend code mein direct relative path call karein: `fetch('/api/users')`.  
> Ingress automatically us request ko backend container par forward karega!

---

## ❓ Troubleshooting & FAQs

| Problem | Wajah (Cause) | Solution |
|---------|---------------|----------|
| `Nexus auth FAILED` | Password galat hai | Email se exact Nexus Password copy karein aur `configure.js` dobara chalayein. |
| `SonarQube 401 Unauthorized` | Jenkins Sonar credential ID match nahi hui | Jenkins credential ID check karein: `<rollno>-sonar-token`. |
| `Kubernetes auth failed` | Kubeconfig file galat ya expired hai | Admin Panel se fresh kubeconfig download karke Jenkins mein upload karein. |
| `CrashLoopBackOff` Backend | MongoDB connection issue | `k8s/deployment.yaml` mein `MONGO_URI` verify karein. |
| `503 Service Unavailable` | Pod abhi start ho raha hai | 30 seconds wait karein; Kubernetes startup probe complete hone par app live ho jayega. |

---

## 🔗 Quick Portal Links

- 🏛️ **Admin Panel:** https://cicd.imcc.skilli.in
- ⚙️ **Jenkins:** https://jenkins.imcc.skilli.in
- 🔍 **SonarQube:** https://sonarqube.imcc.skilli.in
- 📦 **Nexus Registry:** https://nexus.imcc.skilli.in
