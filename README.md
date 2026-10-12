# 🚀 College DevOps & Cloud Lab — Student Starter Kit

Welcome to the **College DevOps & Cloud Lab**!  
Yeh folder students ke liye banaya gaya complete sample template hai jisme aap apne welcome email ke credentials aur project details fill karke apna CI/CD pipeline automate kar sakte hain.

---

## 📋 Architecture & Pipeline Flow
Aapka code is flow ke through automated deploy hoga:
```
GitHub (Code Push)
   ⬇
Jenkins (Pulls Repo & Runs Tests)
   ⬇
SonarQube (Static Code Analysis & Quality Gate)
   ⬇
Docker (Container Image Build)
   ⬇
Nexus (Pushes Image to Private Container Registry)
   ⬇
Kubernetes (Deploys Pods in Your Isolated Namespace)
   ⬇
Live HTTPS URL (https://<rollno>.imcc.skilli.in)
```

---

## 📁 Starter Kit Files Overview

| File | Purpose | Kaha Edit Karna Hai? |
| :--- | :--- | :--- |
| `Jenkinsfile` | 7-Stage Declarative Pipeline | `CHANGE_ME_*` placeholders at the top |
| `Dockerfile` | Multi-stage production container build | Change stack (Node.js/Python) if needed |
| `.dockerignore` | Excludes secrets, `.git`, `node_modules` | No changes needed |
| `sonar-project.properties` | SonarQube scanner properties | Replace `CHANGE_ME_SONAR_PROJECT_KEY` |
| `k8s/deployment.yaml` | Kubernetes Deployment manifest | Replace `CHANGE_ME_K8S_NAMESPACE` |
| `k8s/service.yaml` | Kubernetes ClusterIP Service | Replace `CHANGE_ME_K8S_NAMESPACE` |
| `k8s/ingress.yaml` | Kubernetes Ingress (Domain & TLS) | Replace `CHANGE_ME_APPLICATION_DOMAIN` & Namespace |
| `src/index.js` | Sample working Node.js/Express app | Replace with your actual project source |
| `package.json` | Project dependencies & test script | Add your project dependencies |

---

## 🔑 Email Values Mapping Table (Aapko Kaha Kya Bharna Hai)

Aapko mile Welcome Email ke values ko files me is tarah replace karein:

| Placeholder in Files | Welcome Email Field | Example Value |
| :--- | :--- | :--- |
| `CHANGE_ME_SONAR_PROJECT_KEY` | **SonarQube Project Key** | `mca-2401060-project` |
| `CHANGE_ME_NEXUS_IMAGE_PATH` | **Docker Registry Path** | `student-docker/mca-2401060` |
| `CHANGE_ME_K8S_NAMESPACE` | **Kubernetes Namespace** | `student-mca-2401060` |
| `CHANGE_ME_APPLICATION_DOMAIN` | **Live Application Domain** | `mca-2401060.imcc.skilli.in` |

---

## 🛠️ Step-by-Step Setup Guide

### STEP 1: Apne GitHub Repository Me Files Daalein
1. Apne GitHub par naya repository banayein (e.g. `devops-college-project`).
2. Is `student-starter-kit` ke saare files ko apne repository me copy karein:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit with DevOps starter kit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. `Jenkinsfile`, `sonar-project.properties`, aur `k8s/*.yaml` me apne placeholders (`CHANGE_ME_*`) replace karke push karein.

---

### STEP 2: Jenkins Me Apni Unique Credentials Create Karein

> 💡 **Zero Overlap Guaranteed!**
> Har student ko unke roll number se prefixed unique credential IDs mili hain (e.g. `2401098a-sonar-token`).
> Isliye Jenkins me credentials banate waqt kisi doosre student ke credentials se kabhi koi conflict ya overlap nahi hoga!

Steps:
1. Jenkins open karein: 👉 **https://jenkins.imcc.skilli.in**
2. Login karein (email me mila username/password use karein)
3. Jenkins me jayein: **Manage Jenkins** ➔ **Credentials** ➔ **System** ➔ **Global credentials (unrestricted)** ➔ **Add Credentials**
   *(Ya dashboard ke left menu me **Credentials** ➔ **Global credentials** ➔ **Add Credentials** click karein)*

#### 1️⃣ SonarQube Token Credential:
- **Kind:** `Secret text`
- **Secret:** Apna SonarQube Analysis Token paste karein (e.g. `sqa_xxxxxxxxxxxx` jo email me mila tha)
- **ID:** `<your-rollno>-sonar-token` *(Apne welcome email se exact ID copy karein, e.g. `2401098a-sonar-token`)*
- **Description:** `SonarQube Student Token`

#### 2️⃣ Kubernetes Kubeconfig Credential:
- College Admin Panel me apne profile par jakar **"Download .kubeconfig"** button dabayein (is se `<namespace>-kubeconfig.yaml` file download hogi).
- Jenkins me Add Credentials par:
  - **Kind:** `Secret file`
  - **File:** Download hui `.yaml` file ko choose karein
  - **ID:** `<your-rollno>-kubeconfig` *(Apne welcome email se exact ID copy karein, e.g. `2401098a-kubeconfig`)*
  - **Description:** `Student Kubeconfig File`

> ℹ️ **Nexus Registry Credential:** Nexus ke liye alag se Jenkins credential create karne ki zaroorat nahi hai! Nexus login credentials (`NEXUS_USER` & `NEXUS_PASS`) aapko seedha apne `Jenkinsfile` ke environment block me likhne hain (jo email me mile hain).

---

### STEP 3: Jenkins Me Apni Pipeline Job Banayein
1. Jenkins home dashboard par jayein aur **"New Item"** click karein.
2. Job ka name likhein: e.g. `my-app` ya `<your-rollno>-pipeline`
3. **"Pipeline"** select karke **OK** dabayein.
4. Pipeline configuration me scroll karke:
   - **Definition:** `Pipeline script from SCM`
   - **SCM:** `Git`
   - **Repository URL:** Apne GitHub repo ka URL (e.g. `https://github.com/username/repo.git`)
   - **Branch Specifier:** `*/main`
   - **Script Path:** `Jenkinsfile`
5. **Save** par click karein.

---

### STEP 3.5: GitHub Webhook Setup (Auto-Deploy On "git push")
Agar aap chahte hain ki jaise hi aap `git push origin main` karein, pipeline apne aap background me run hoke deploy ho jaye:

1. Apne GitHub Repository me **Settings** ➔ **Webhooks** ➔ **"Add webhook"** par click karein.
2. Har field me exact yeh bharein:

| Field Name in GitHub | Kya Bharna Hai? | Detail / Explanation |
| :--- | :--- | :--- |
| **Payload URL \*** | `https://jenkins.imcc.skilli.in/github-webhook/` | ⚠️ **Most Important:** Aakhiri ka slash `/` lagana zaroori hai! |
| **Content type \*** | `application/json` | Dropdown se `application/json` select karein |
| **Secret** | *(Leave completely empty / Khali chhod dein)* | Kuch nahi likhna |
| **SSL verification** | `Enable SSL verification` | Enabled select karein |
| **Which events?** | `Just the push event.` | Sirf push event select rehne dein |
| **Active** | `[x] Checked` | Checkbox tick hona chahiye |

3. Green button **"Add webhook"** dabayein.  
   - GitHub par green checkmark `✓ 200 OK` dikhega.
   - Ab se har `git push` par Jenkins bina open kiye apne aap deploy kar dega! 🚀

---

### STEP 4: First Build Run Karein & Verify Karein
1. Jenkins job page par jakar **"Build Now"** dabayein (first time ek baar click karna zaroori hai).
2. **Console Output** open karein aur stages verify karein:
   - ✅ Stage 1: Checkout Code
   - ✅ Stage 2: Install & Test
   - ✅ Stage 3: SonarQube Analysis
   - ✅ Stage 4: Docker Build
   - ✅ Stage 5: Push to Nexus
   - ✅ Stage 6: Deploy to Kubernetes
   - ✅ Stage 7: Verify Rollout Status
3. Pipeline Success hone ke baad apna assigned Live URL open karein:
   👉 **`https://<your-rollno>.imcc.skilli.in`**  
   Aapka application live running dikhega! 🎉

---

## ⚠️ Troubleshooting & Common Errors

1. **SonarQube 401 / 403 Forbidden:**
   - Check karein ki Jenkins credential ID exact `sonar-token-student` hai ya nahi.
   - Token email me aaya hua student token (`sqa_...`) hona chahiye.

2. **Nexus Login / Push Denied:**
   - Verify karein ki credential ID `nexus-student-creds` sahi hai.
   - Image path aapka assigned repository hona chahiye (e.g. `student-docker/<your-rollno>/my-app`).

3. **Kubernetes Unauthorized / Forbidden:**
   - Verify karein ki `student-kubeconfig` credential me namespace-scoped kubeconfig upload kiya hai.

4. **ImagePullBackOff in Kubernetes:**
   - Agar pod create hota hai par image pull nahi hoti, to check karein ki image Nexus par push hui hai aur tag match ho raha hai.

5. **CrashLoopBackOff:**
   - Check karein ki container port 3000 par listen kar raha hai aur `/health` endpoint response de raha hai.

---

## 🏗️ Full-Stack Project Setup (Frontend + Backend: 2 Images)

Agar aapka project Full-Stack hai (jaise React Frontend + Node/Python Backend):

### 1️⃣ Local Testing (Docker Compose)
Aapke starter kit me `docker-compose.yml` diya gaya hai. Apne computer par local test karne ke liye run karein:
```bash
docker compose up --build
```
- Frontend open hoga: `http://localhost:3000`
- Backend API open hoga: `http://localhost:5000`
- MongoDB chalu hoga: `localhost:27017`

### 2️⃣ Kubernetes Ingress Me Frontend & Backend Kaise Link Hote Hain?
Student ko sirf **ek hi domain** milta hai (jaise `https://mca-2401060.imcc.skilli.in`). Kubernetes Ingress **Path Routing** use karke dono ko seamlessly link karta hai:

```
               [ Browser / User ]
                        │
                        ▼ https://mca-2401060.imcc.skilli.in
            ┌───────────────────────┐
            │   Kubernetes Ingress  │
            └───────────┬───────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼ path: /api                  ▼ path: /
┌─────────────────┐           ┌──────────────────┐
│ backend-service │           │ frontend-service │
│   (Port: 5000)  │           │   (Port: 80)     │
└────────┬────────┘           └────────┬─────────┘
         ▼                             ▼
┌─────────────────┐           ┌──────────────────┐
│   Backend Pod   │           │   Frontend Pod   │
└─────────────────┘           └──────────────────┘
```

- **Jab user kisi API ko call karega (`/api/login`, `/api/products`):**  
  Ingress automatically request ko `backend-service` (Port 5000) par bhejega!
- **Jab user homepage ya UI kholega (`/`):**  
  Ingress request ko `frontend-service` par bhejega!
- **Fayda:** 0% CORS Error! Frontend aur Backend dono same domain par chalte hain!

### 3️⃣ Jenkins Pipeline For Full-Stack
Agar Frontend aur Backend alag-alag folders me hain, to starter kit me diya hua **`Jenkinsfile.fullstack`** use karein:
- Stage 4 me Jenkins dono images (`backend` aur `frontend`) ko **Parallel** me build karega.
- Stage 5 me dono images ko Nexus me push karega:
  - `nexus.imcc.skilli.in/student-docker/<rollno>/backend:latest`
  - `nexus.imcc.skilli.in/student-docker/<rollno>/frontend:latest`
- Stage 6 me `k8s/fullstack-deployment.yaml` apply karke dono pods live kar dega!

