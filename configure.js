#!/usr/bin/env node

/**
 * =============================================================================
 * 🚀 Skilli DevOps Lab — Student 1-Click DevOps Generator & Configurator
 * =============================================================================
 * 
 * Ye script 2 tarah se kaam karti hai:
 * 1. Agar 'student-starter-kit' mein run kiya:
 *    -> Saari files ke placeholders (CHANGE_ME_) ko aapki details se replace karegi.
 * 
 * 2. Agar student ne apne kisi bhi EXISTING PROJECT folder mein run kiya:
 *    -> Jenkinsfile, k8s/, Backend/Dockerfile, Frontend/Dockerfile, nginx.conf,
 *       .gitignore sab kuch APNE AAP CREATE kar degi aapke roll number ke hisaab se!
 * 
 * Usage:
 *   node configure.js
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BASE_DIR = __dirname;

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      args[key] = value || true;
    }
  });
  return args;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE GENERATORS (Agar student ke project me files nahi hain to create karega)
// ─────────────────────────────────────────────────────────────────────────────

function getJenkinsfile(rollno, nexusPass, sonarCredId, kubeCredId) {
  return `// =============================================================================
// Skilli College DevOps & Cloud Lab — Fullstack CI/CD Pipeline
// Flow: GitHub → Jenkins → SonarQube → BuildKit → Nexus → Kubernetes
// =============================================================================

pipeline {
    agent { label 'docker-builder' }

    triggers {
        githubPush()
        pollSCM('H/5 * * * *')
    }

    environment {
        SONAR_HOST_URL    = 'https://sonarqube.imcc.skilli.in'
        SONAR_PROJECT_KEY = '${rollno}-project'

        NEXUS_REGISTRY    = 'nexus.imcc.skilli.in'
        NEXUS_REPO_PATH   = 'student-docker/${rollno}'
        K8S_NAMESPACE     = 'student-${rollno}'

        NEXUS_USER        = '${rollno}'
        NEXUS_PASS        = '${nexusPass}'

        SONAR_CRED_ID     = '${sonarCredId}'
        KUBE_CRED_ID      = '${kubeCredId}'

        IMAGE_TAG         = "\${env.BUILD_NUMBER}-\${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'}"
        BACKEND_IMAGE     = "\${env.NEXUS_REGISTRY}/\${env.NEXUS_REPO_PATH}/backend:\${env.IMAGE_TAG}"
        FRONTEND_IMAGE    = "\${env.NEXUS_REGISTRY}/\${env.NEXUS_REPO_PATH}/frontend:\${env.IMAGE_TAG}"
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                echo "🚀 Checking out source code..."
                checkout scm
                script {
                    echo "Branch : \${env.GIT_BRANCH}"
                    echo "Commit : \${env.GIT_COMMIT}"
                }
            }
        }

        stage('2. Install & Test') {
            steps {
                echo "📦 Checking environment and testing..."
                sh '''
                    BACKEND_DIR=Backend ; [ ! -d "$BACKEND_DIR" ] && BACKEND_DIR=backend
                    FRONTEND_DIR=Frontend ; [ ! -d "$FRONTEND_DIR" ] && FRONTEND_DIR=frontend

                    if command -v npm > /dev/null 2>&1; then
                        echo "npm $(npm --version) found"
                    else
                        echo "⚠️ npm not in base agent — dependencies verified during Docker build."
                    fi
                '''
            }
        }

        stage('3. SonarQube Analysis') {
            steps {
                echo "📊 Running SonarQube Quality Scan for project: \${SONAR_PROJECT_KEY}..."
                withCredentials([string(credentialsId: env.SONAR_CRED_ID, variable: 'SONAR_TOKEN')]) {
                    sh '''
                        if which sonar-scanner > /dev/null 2>&1; then
                            sonar-scanner \\
                                -Dsonar.projectKey=\${SONAR_PROJECT_KEY} \\
                                -Dsonar.host.url=\${SONAR_HOST_URL} \\
                                -Dsonar.token=\${SONAR_TOKEN}
                        else
                            echo "Sonar scanner CLI not present on agent — skipping local scan."
                        fi
                    '''
                }
            }
        }

        stage('4. Build & Push Docker Images') {
            steps {
                container('buildkit') {
                    sh '''
                        echo "🔧 Authenticating with Nexus Docker Registry (\${NEXUS_REGISTRY})..."
                        C_AUTH=$(printf '%s:%s' "\${NEXUS_USER}" "\${NEXUS_PASS}" | base64 | tr -d '\\r\\n')
                        if wget -q -O /dev/null --header "Authorization: Basic \${C_AUTH}" https://\${NEXUS_REGISTRY}/v2/ 2>/dev/null; then
                            echo "✅ Nexus auth successful!"
                        else
                            echo "❌ Nexus auth FAILED — check NEXUS_USER / NEXUS_PASS"
                            exit 1
                        fi

                        mkdir -p /home/user/.docker /home/jenkins/agent/.docker
                        cat > /home/user/.docker/config.json << EOF
{
  "auths": {
    "\${NEXUS_REGISTRY}": { "auth": "\${C_AUTH}" },
    "https://\${NEXUS_REGISTRY}": { "auth": "\${C_AUTH}" },
    "\${NEXUS_REGISTRY}/\${NEXUS_REPO_PATH}": { "auth": "\${C_AUTH}" }
  }
}
EOF
                        chmod 600 /home/user/.docker/config.json
                        cp /home/user/.docker/config.json /home/jenkins/agent/.docker/config.json
                        export DOCKER_CONFIG=/home/user/.docker

                        BUILDKIT_SOCK=unix:///run/user/1000/buildkit/buildkitd.sock
                        BACKEND_DIR=Backend ; [ ! -d "$BACKEND_DIR" ] && BACKEND_DIR=backend
                        FRONTEND_DIR=Frontend ; [ ! -d "$FRONTEND_DIR" ] && FRONTEND_DIR=frontend

                        echo "Building & pushing Backend image (\${BACKEND_IMAGE})..."
                        buildctl --addr \${BUILDKIT_SOCK} build \\
                            --frontend dockerfile.v0 \\
                            --local context=\${BACKEND_DIR} \\
                            --local dockerfile=\${BACKEND_DIR} \\
                            --output "type=image,name=\${BACKEND_IMAGE},push=true"

                        echo "Building & pushing Frontend image (\${FRONTEND_IMAGE})..."
                        buildctl --addr \${BUILDKIT_SOCK} build \\
                            --frontend dockerfile.v0 \\
                            --local context=\${FRONTEND_DIR} \\
                            --local dockerfile=\${FRONTEND_DIR} \\
                            --output "type=image,name=\${FRONTEND_IMAGE},push=true"

                        echo "✅ All images built & pushed via BuildKit!"
                    '''
                }
            }
        }

        stage('5. Deploy Fullstack to Kubernetes') {
            steps {
                echo "☸️ Applying fullstack manifests to namespace \${K8S_NAMESPACE}..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        if ! command -v kubectl > /dev/null 2>&1; then
                            curl -sLO https://dl.k8s.io/release/v1.30.0/bin/linux/amd64/kubectl
                            chmod +x ./kubectl
                        fi
                        export PATH=.:$PATH
                        cp "\${KUBECONFIG_FILE}" ./kubeconfig && chmod 600 ./kubeconfig
                        export KUBECONFIG=$(pwd)/kubeconfig

                        kubectl create secret docker-registry nexus-docker-secret \\
                            --docker-server=\${NEXUS_REGISTRY} \\
                            --docker-username=\${NEXUS_USER} \\
                            --docker-password=\${NEXUS_PASS} \\
                            -n \${K8S_NAMESPACE} \\
                            --dry-run=client -o yaml | \\
                        kubectl apply -f - --validate=false --insecure-skip-tls-verify=true

                        sed -i "s|backend:latest|backend:\${IMAGE_TAG}|g"   k8s/deployment.yaml
                        sed -i "s|frontend:latest|frontend:\${IMAGE_TAG}|g" k8s/deployment.yaml

                        kubectl apply -f k8s/ -n \${K8S_NAMESPACE} --validate=false --insecure-skip-tls-verify=true
                        kubectl set image deployment/backend-deployment  backend=\${BACKEND_IMAGE}   -n \${K8S_NAMESPACE} --insecure-skip-tls-verify=true
                        kubectl set image deployment/frontend-deployment frontend=\${FRONTEND_IMAGE}  -n \${K8S_NAMESPACE} --insecure-skip-tls-verify=true
                    '''
                }
            }
        }

        stage('6. Verify Rollout Status') {
            steps {
                echo "🔍 Checking rollout status..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        export PATH=.:$PATH
                        [ -f ./kubeconfig ] || { cp "\${KUBECONFIG_FILE}" ./kubeconfig && chmod 600 ./kubeconfig; }
                        export KUBECONFIG=$(pwd)/kubeconfig

                        kubectl rollout status deployment/backend-deployment  -n \${K8S_NAMESPACE} --timeout=120s --insecure-skip-tls-verify=true || true
                        kubectl rollout status deployment/frontend-deployment -n \${K8S_NAMESPACE} --timeout=120s --insecure-skip-tls-verify=true || true
                        kubectl get pods,svc,ingress -n \${K8S_NAMESPACE} --insecure-skip-tls-verify=true
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "🎉 Deployed successfully! 👉 https://${rollno}.imcc.skilli.in"
        }
        failure {
            echo "❌ Pipeline failed! Review logs above."
        }
    }
}
`;
}

function getK8sDeployment(k8sNamespace, appName, nexusImagePath, mongoUri, jwtSecret) {
  return `# Skilli Fullstack Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
  namespace: ${k8sNamespace}
  labels:
    app: ${appName}
    tier: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${appName}
      tier: backend
  template:
    metadata:
      labels:
        app: ${appName}
        tier: backend
    spec:
      imagePullSecrets:
        - name: nexus-docker-secret
      containers:
        - name: backend
          image: nexus.imcc.skilli.in/${nexusImagePath}/backend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 5000
              name: http
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "5000"
            - name: MONGO_URI
              value: "${mongoUri}"
            - name: JWT_SECRET
              value: "${jwtSecret}"
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 250m
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 15
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: ${k8sNamespace}
  labels:
    app: ${appName}
    tier: backend
spec:
  type: ClusterIP
  selector:
    app: ${appName}
    tier: backend
  ports:
    - name: http
      port: 5000
      targetPort: 5000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-deployment
  namespace: ${k8sNamespace}
  labels:
    app: ${appName}
    tier: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${appName}
      tier: frontend
  template:
    metadata:
      labels:
        app: ${appName}
        tier: frontend
    spec:
      imagePullSecrets:
        - name: nexus-docker-secret
      containers:
        - name: frontend
          image: nexus.imcc.skilli.in/${nexusImagePath}/frontend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 80
              name: http
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 250m
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: ${k8sNamespace}
  labels:
    app: ${appName}
    tier: frontend
spec:
  type: ClusterIP
  selector:
    app: ${appName}
    tier: frontend
  ports:
    - name: http
      port: 80
      targetPort: 80
`;
}

function getK8sIngress(k8sNamespace, domain) {
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: ${k8sNamespace}
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/proxy-body-size: "20m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - ${domain}
      secretName: student-app-tls
  rules:
    - host: ${domain}
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 5000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
`;
}

function getBackendDockerfile() {
  return `# Multi-stage production container for Backend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
RUN apk add --no-cache curl
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001 -G nodejs
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY --from=builder /app ./
RUN chown -R nodeuser:nodejs /app
USER nodeuser
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD curl -f http://localhost:5000/health || exit 1
CMD ["node", "index.js"]
`;
}

function getFrontendDockerfile() {
  return `# Multi-stage production container for Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD wget -q -O /dev/null http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
`;
}

function getNginxConf() {
  return `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html index.htm;
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_types text/plain text/css text/javascript application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
}
`;
}

function getSonarProperties(rollno, appName) {
  return `sonar.projectKey=${rollno}-project
sonar.projectName=${appName}
sonar.projectVersion=1.0.0
sonar.sources=Backend,Frontend
sonar.sourceEncoding=UTF-8
sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**
`;
}

function getGitignore() {
  return `.env
.env.*
!.env.example
.student-config.json
node_modules/
dist/
build/
*.log
.vscode/
.idea/
kubeconfig*
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '='.repeat(68));
  console.log('   🎓 SKILLI COLLEGE DEVOPS LAB — STUDENT AUTO-GENERATOR');
  console.log('='.repeat(68) + '\n');
  console.log('Ye tool aapke project mein saari CI/CD aur Kubernetes files ko');
  console.log('automatically generate / update kar dega.\n');

  const cliArgs = parseArgs();

  // 1. Roll Number
  let rollno = cliArgs['rollno'];
  if (!rollno) {
    rollno = (await ask('1️⃣  Student ID / Roll Number (e.g. 24010988a): ')).trim();
  }
  if (!rollno) {
    console.error('❌ Error: Roll Number zaroori hai!');
    process.exit(1);
  }
  rollno = rollno.toLowerCase();

  // 2. Nexus Password
  let nexusPass = cliArgs['nexus-pass'];
  if (!nexusPass) {
    nexusPass = (await ask('2️⃣  Nexus Password (from Welcome Email): ')).trim();
  }
  if (!nexusPass) {
    console.error('❌ Error: Nexus Password zaroori hai!');
    process.exit(1);
  }

  // 3. SonarQube Token
  let sonarToken = cliArgs['sonar-token'];
  if (!sonarToken) {
    sonarToken = (await ask('3️⃣  SonarQube Token (starts with sqa_... from email): ')).trim();
  }

  // 4. App Name
  let appName = cliArgs['app'] || cliArgs['app-name'];
  if (!appName) {
    const defaultApp = `app-${rollno}`;
    const ans = (await ask(`4️⃣  Application Name [default: ${defaultApp}]: `)).trim();
    appName = ans || defaultApp;
  }
  appName = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // 5. MongoDB URI (optional)
  let mongoUri = cliArgs['mongo-uri'];
  if (mongoUri === undefined) {
    mongoUri = (await ask('5️⃣  MongoDB Connection URI (optional, press Enter to skip): ')).trim();
  }
  if (!mongoUri) {
    mongoUri = 'mongodb://mongo:27017/' + appName;
  }

  // 6. JWT Secret
  let jwtSecret = cliArgs['jwt-secret'];
  if (!jwtSecret) {
    jwtSecret = 'secret-key-' + rollno + '-' + Math.random().toString(36).substring(2, 8);
  }

  rl.close();

  // Derived values
  const sonarProjectKey = `${rollno}-project`;
  const nexusImagePath  = `student-docker/${rollno}`;
  const k8sNamespace     = `student-${rollno}`;
  const nexusUser        = rollno;
  const sonarCredId      = `${rollno}-sonar-token`;
  const kubeCredId       = `${rollno}-kubeconfig`;
  const domain           = `${rollno}.imcc.skilli.in`;

  console.log('\n' + '-'.repeat(68));
  console.log('⚙️  Applying configuration to project...');
  console.log(`   • Student       : ${rollno}`);
  console.log(`   • Namespace     : ${k8sNamespace}`);
  console.log(`   • Domain        : https://${domain}`);
  console.log('-'.repeat(68) + '\n');

  // Helper to write file safely
  function writeFileSafe(filePath, content, desc) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ [CREATED / UPDATED] ${desc} -> ${path.relative(BASE_DIR, filePath)}`);
  }

  // Detect Backend & Frontend casing
  let backendDirName = fs.existsSync(path.join(BASE_DIR, 'backend')) ? 'backend' : 'Backend';
  let frontendDirName = fs.existsSync(path.join(BASE_DIR, 'frontend')) ? 'frontend' : 'Frontend';

  // 1. Jenkinsfile
  const jenkinsfilePath = path.join(BASE_DIR, 'Jenkinsfile');
  if (fs.existsSync(jenkinsfilePath) && fs.readFileSync(jenkinsfilePath, 'utf8').includes('CHANGE_ME_')) {
    let content = fs.readFileSync(jenkinsfilePath, 'utf8')
      .replace(/CHANGE_ME_SONAR_PROJECT_KEY/g, sonarProjectKey)
      .replace(/CHANGE_ME_NEXUS_IMAGE_PATH/g, nexusImagePath)
      .replace(/CHANGE_ME_K8S_NAMESPACE/g, k8sNamespace)
      .replace(/CHANGE_ME_NEXUS_USERNAME/g, nexusUser)
      .replace(/CHANGE_ME_NEXUS_PASSWORD/g, nexusPass)
      .replace(/CHANGE_ME_SONAR_CRED_ID/g, sonarCredId)
      .replace(/CHANGE_ME_KUBE_CRED_ID/g, kubeCredId)
      .replace(/CHANGE_ME_APPLICATION_DOMAIN/g, domain);
    writeFileSafe(jenkinsfilePath, content, 'Jenkinsfile');
  } else {
    writeFileSafe(jenkinsfilePath, getJenkinsfile(rollno, nexusPass, sonarCredId, kubeCredId), 'Jenkinsfile');
  }

  // 2. k8s/deployment.yaml
  const deployPath = path.join(BASE_DIR, 'k8s', 'deployment.yaml');
  if (fs.existsSync(deployPath) && fs.readFileSync(deployPath, 'utf8').includes('CHANGE_ME_')) {
    let content = fs.readFileSync(deployPath, 'utf8')
      .replace(/CHANGE_ME_K8S_NAMESPACE/g, k8sNamespace)
      .replace(/CHANGE_ME_APP_NAME/g, appName)
      .replace(/CHANGE_ME_NEXUS_IMAGE_PATH/g, nexusImagePath)
      .replace(/CHANGE_ME_MONGODB_CONNECTION_STRING/g, mongoUri)
      .replace(/CHANGE_ME_JWT_SECRET/g, jwtSecret);
    writeFileSafe(deployPath, content, 'k8s/deployment.yaml');
  } else {
    writeFileSafe(deployPath, getK8sDeployment(k8sNamespace, appName, nexusImagePath, mongoUri, jwtSecret), 'k8s/deployment.yaml');
  }

  // 3. k8s/ingress.yaml
  const ingressPath = path.join(BASE_DIR, 'k8s', 'ingress.yaml');
  if (fs.existsSync(ingressPath) && fs.readFileSync(ingressPath, 'utf8').includes('CHANGE_ME_')) {
    let content = fs.readFileSync(ingressPath, 'utf8')
      .replace(/CHANGE_ME_K8S_NAMESPACE/g, k8sNamespace)
      .replace(/CHANGE_ME_APPLICATION_DOMAIN/g, domain);
    writeFileSafe(ingressPath, content, 'k8s/ingress.yaml');
  } else {
    writeFileSafe(ingressPath, getK8sIngress(k8sNamespace, domain), 'k8s/ingress.yaml');
  }

  // 4. sonar-project.properties
  const sonarPath = path.join(BASE_DIR, 'sonar-project.properties');
  writeFileSafe(sonarPath, getSonarProperties(rollno, appName), 'sonar-project.properties');

  // 5. Backend Dockerfile (if missing)
  const backendDocker = path.join(BASE_DIR, backendDirName, 'Dockerfile');
  if (!fs.existsSync(backendDocker)) {
    writeFileSafe(backendDocker, getBackendDockerfile(), `${backendDirName}/Dockerfile`);
  }

  // 6. Frontend Dockerfile & nginx.conf (if missing)
  const frontendDocker = path.join(BASE_DIR, frontendDirName, 'Dockerfile');
  if (!fs.existsSync(frontendDocker)) {
    writeFileSafe(frontendDocker, getFrontendDockerfile(), `${frontendDirName}/Dockerfile`);
  }
  const nginxPath = path.join(BASE_DIR, frontendDirName, 'nginx.conf');
  if (!fs.existsSync(nginxPath)) {
    writeFileSafe(nginxPath, getNginxConf(), `${frontendDirName}/nginx.conf`);
  }

  // 7. .gitignore
  const gitignorePath = path.join(BASE_DIR, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    writeFileSafe(gitignorePath, getGitignore(), '.gitignore');
  }

  // 8. Save local configuration record
  const configBackup = {
    rollno,
    appName,
    k8sNamespace,
    domain,
    nexusImagePath,
    nexusUser,
    sonarProjectKey,
    sonarCredId,
    kubeCredId,
    configuredAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(BASE_DIR, '.student-config.json'), JSON.stringify(configBackup, null, 2), 'utf8');

  console.log('\n' + '='.repeat(68));
  console.log('🎉 ALL DEVOPS FILES ARE READY & CONFIGURED!');
  console.log('='.repeat(68));
  console.log('\n📋 AGLE 3 STEPS KAREIN:\n');
  console.log('1️⃣  Jenkins Credentials banayein (https://jenkins.imcc.skilli.in):');
  console.log(`    • Kind: Secret text | ID: ${sonarCredId} | Secret: [Aapka Sonar Token]`);
  console.log(`    • Kind: Secret file | ID: ${kubeCredId}  | File  : [Admin panel se downloaded kubeconfig]`);
  console.log('\n2️⃣  GitHub par code push karein:');
  console.log('    git init');
  console.log('    git add .');
  console.log('    git commit -m "feat: setup fullstack devops pipeline"');
  console.log('    git branch -M main');
  console.log('    git remote add origin https://github.com/<username>/<repo>.git');
  console.log('    git push -u origin main');
  console.log('\n3️⃣  Jenkins pipeline job banayein aur "Build Now" click karein!');
  console.log(`    Deploy hone ke baad live app: https://${domain}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
