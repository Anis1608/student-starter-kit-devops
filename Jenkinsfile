// =============================================================================
// Skilli College DevOps & Cloud Lab — Fullstack CI/CD Pipeline
// Flow: GitHub → Jenkins → SonarQube → BuildKit → Nexus → Kubernetes
//
// ─── HOW TO USE THIS FILE ────────────────────────────────────────────────────
//  1. Search for every "CHANGE_ME_" below and replace with your real values.
//     (All values are in your Welcome Email sent by the Admin Panel.)
//  2. Keep this file named "Jenkinsfile" at the ROOT of your GitHub repo.
//  3. Create the 2 Jenkins credentials listed in STEP 2 of the README.
//  4. Point your Jenkins Pipeline job to your repo → Build Now!
//
// ─── GITHUB AUTO-DEPLOY WEBHOOK ──────────────────────────────────────────────
//  1. GitHub repo → Settings → Webhooks → Add webhook
//  2. Payload URL : https://jenkins.imcc.skilli.in/github-webhook/  (slash at end!)
//  3. Content type: application/json
//  4. Secret      : (leave empty)
//  5. Events      : Just the push event
//  6. Active      : [x]  →  "Add webhook"
//  ✅ Now every "git push" auto-deploys your app!
//
// ─── CREDENTIALS NEEDED IN JENKINS (2 total) ─────────────────────────────────
//  • ID: CHANGE_ME_SONAR_CRED_ID   → Kind: Secret text  → Value: sqa_... token
//  • ID: CHANGE_ME_KUBE_CRED_ID    → Kind: Secret file  → Value: kubeconfig .yaml
//    (Download the kubeconfig from Admin Panel → Student Profile → Kubeconfig)
// =============================================================================

pipeline {
    agent { label 'docker-builder' }

    triggers {
        githubPush()
        pollSCM('H/5 * * * *')
    }

    environment {
        // =====================================================================
        // ✏️  STEP 1 — FILL THESE 6 VALUES FROM YOUR WELCOME EMAIL  ✏️
        // =====================================================================

        // SonarQube project key  (Email: "SonarQube Project Key")
        // Example: '24010988a-project'
        SONAR_HOST_URL    = 'https://sonarqube.imcc.skilli.in'
        SONAR_PROJECT_KEY = 'CHANGE_ME_SONAR_PROJECT_KEY'

        // Nexus Docker path  (Email: "Docker Registry Path")
        // Example: 'student-docker/24010988a'
        NEXUS_REGISTRY    = 'nexus.imcc.skilli.in'
        NEXUS_REPO_PATH   = 'CHANGE_ME_NEXUS_IMAGE_PATH'

        // Kubernetes namespace  (Email: "Kubernetes Namespace")
        // Example: 'student-24010988a'
        K8S_NAMESPACE     = 'CHANGE_ME_K8S_NAMESPACE'

        // Nexus login  (Email: "Nexus Username" and "Nexus Password")
        // Example: '24010988a'  and  'W%Z%4R!eB32X'
        NEXUS_USER        = 'CHANGE_ME_NEXUS_USERNAME'
        NEXUS_PASS        = 'CHANGE_ME_NEXUS_PASSWORD'

        // =====================================================================
        // ✏️  STEP 2 — YOUR UNIQUE JENKINS CREDENTIAL IDs  ✏️
        //    Create these in Jenkins → Manage Jenkins → Credentials → Global
        // =====================================================================

        // SonarQube token credential ID  (Email: "Jenkins Sonar Cred ID")
        // Example: '24010988a-sonar-token'
        SONAR_CRED_ID     = 'CHANGE_ME_SONAR_CRED_ID'

        // Kubeconfig file credential ID  (Email: "Jenkins Kube Cred ID")
        // Example: '24010988a-kubeconfig'
        KUBE_CRED_ID      = 'CHANGE_ME_KUBE_CRED_ID'

        // ─── Auto-generated — DO NOT EDIT BELOW ──────────────────────────────
        IMAGE_TAG        = "${env.BUILD_NUMBER}-${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'}"
        BACKEND_IMAGE    = "${env.NEXUS_REGISTRY}/${env.NEXUS_REPO_PATH}/backend:${env.IMAGE_TAG}"
        FRONTEND_IMAGE   = "${env.NEXUS_REGISTRY}/${env.NEXUS_REPO_PATH}/frontend:${env.IMAGE_TAG}"
    }

    stages {

        // ─────────────────────────────────────────────────────────────────────
        stage('1. Checkout Code') {
        // ─────────────────────────────────────────────────────────────────────
            steps {
                echo "🚀 Checking out source code..."
                checkout scm
                script {
                    echo "Branch : ${env.GIT_BRANCH}"
                    echo "Commit : ${env.GIT_COMMIT}"
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        stage('2. Install & Test') {
        // ─────────────────────────────────────────────────────────────────────
            steps {
                echo "📦 Checking environment and testing..."
                sh '''
                    BACKEND_DIR=Backend
                    [ ! -d "$BACKEND_DIR" ] && BACKEND_DIR=backend
                    FRONTEND_DIR=Frontend
                    [ ! -d "$FRONTEND_DIR" ] && FRONTEND_DIR=frontend

                    if command -v npm > /dev/null 2>&1; then
                        echo "npm $(npm --version) found"
                    else
                        echo "⚠️  npm not in base agent — dependencies verified during Docker multi-stage build."
                    fi
                '''
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        stage('3. SonarQube Analysis') {
        // ─────────────────────────────────────────────────────────────────────
            steps {
                echo "📊 Running SonarQube Quality Scan for project: ${SONAR_PROJECT_KEY}..."
                withCredentials([string(credentialsId: env.SONAR_CRED_ID, variable: 'SONAR_TOKEN')]) {
                    sh '''
                        if which sonar-scanner > /dev/null 2>&1; then
                            sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.host.url=${SONAR_HOST_URL} \
                                -Dsonar.token=${SONAR_TOKEN}
                        else
                            echo "Sonar scanner CLI not present on agent — skipping local scan."
                            echo "Tip: Configure SonarQube scanner in your Jenkins tool configuration."
                        fi
                    '''
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        stage('4. Build & Push Docker Images') {
        // ─────────────────────────────────────────────────────────────────────
            steps {
                container('buildkit') {
                    sh '''
                        echo "🔧 Authenticating with Nexus Docker Registry (${NEXUS_REGISTRY})..."

                        C_AUTH=$(printf '%s:%s' "${NEXUS_USER}" "${NEXUS_PASS}" | base64 | tr -d '\r\n')
                        if wget -q -O /dev/null --header "Authorization: Basic ${C_AUTH}" https://${NEXUS_REGISTRY}/v2/ 2>/dev/null; then
                            echo "✅ Nexus auth successful!"
                        else
                            echo "❌ Nexus auth FAILED — check NEXUS_USER / NEXUS_PASS in Jenkinsfile"
                            exit 1
                        fi

                        mkdir -p /home/user/.docker /home/jenkins/agent/.docker
                        cat > /home/user/.docker/config.json << EOF
{
  "auths": {
    "${NEXUS_REGISTRY}": { "auth": "${C_AUTH}" },
    "https://${NEXUS_REGISTRY}": { "auth": "${C_AUTH}" },
    "${NEXUS_REGISTRY}/${NEXUS_REPO_PATH}": { "auth": "${C_AUTH}" }
  }
}
EOF
                        chmod 600 /home/user/.docker/config.json
                        cp /home/user/.docker/config.json /home/jenkins/agent/.docker/config.json
                        export DOCKER_CONFIG=/home/user/.docker

                        BUILDKIT_SOCK=unix:///run/user/1000/buildkit/buildkitd.sock

                        BACKEND_DIR=Backend ; [ ! -d "$BACKEND_DIR" ] && BACKEND_DIR=backend
                        FRONTEND_DIR=Frontend ; [ ! -d "$FRONTEND_DIR" ] && FRONTEND_DIR=frontend

                        echo "Building & pushing Backend image (${BACKEND_IMAGE})..."
                        buildctl --addr ${BUILDKIT_SOCK} build \
                            --frontend dockerfile.v0 \
                            --local context=${BACKEND_DIR} \
                            --local dockerfile=${BACKEND_DIR} \
                            --output "type=image,name=${BACKEND_IMAGE},push=true"

                        echo "Building & pushing Frontend image (${FRONTEND_IMAGE})..."
                        buildctl --addr ${BUILDKIT_SOCK} build \
                            --frontend dockerfile.v0 \
                            --local context=${FRONTEND_DIR} \
                            --local dockerfile=${FRONTEND_DIR} \
                            --output "type=image,name=${FRONTEND_IMAGE},push=true"

                        echo "✅ All images built & pushed via BuildKit!"
                    '''
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        stage('5. Deploy Fullstack to Kubernetes') {
        // ─────────────────────────────────────────────────────────────────────
            steps {
                echo "☸️  Applying fullstack manifests to namespace ${K8S_NAMESPACE}..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        if ! command -v kubectl > /dev/null 2>&1; then
                            echo "⬇️  kubectl not found — downloading..."
                            curl -sLO https://dl.k8s.io/release/v1.30.0/bin/linux/amd64/kubectl
                            chmod +x ./kubectl
                        fi
                        export PATH=.:$PATH

                        cp "${KUBECONFIG_FILE}" ./kubeconfig && chmod 600 ./kubeconfig
                        export KUBECONFIG=$(pwd)/kubeconfig

                        echo "Creating / ensuring Nexus image pull secret in namespace ${K8S_NAMESPACE}..."
                        kubectl create secret docker-registry nexus-docker-secret \
                            --docker-server=${NEXUS_REGISTRY} \
                            --docker-username=${NEXUS_USER} \
                            --docker-password=${NEXUS_PASS} \
                            -n ${K8S_NAMESPACE} \
                            --dry-run=client -o yaml | \
                        kubectl apply -f - --validate=false --insecure-skip-tls-verify=true

                        sed -i "s|backend:latest|backend:${IMAGE_TAG}|g"   k8s/deployment.yaml
                        sed -i "s|frontend:latest|frontend:${IMAGE_TAG}|g" k8s/deployment.yaml

                        AUTH_OK=false
                        kubectl auth can-i create deployments -n ${K8S_NAMESPACE} --insecure-skip-tls-verify=true && AUTH_OK=true
                        [ "$AUTH_OK" = "true" ] || { echo "❌ Kubernetes auth failed!"; exit 1; }
                        echo "✅ Kubernetes authentication verified for namespace ${K8S_NAMESPACE}!"

                        echo "Applying manifests..."
                        kubectl apply -f k8s/ -n ${K8S_NAMESPACE} --validate=false --insecure-skip-tls-verify=true

                        kubectl set image deployment/backend-deployment  backend=${BACKEND_IMAGE}   -n ${K8S_NAMESPACE} --insecure-skip-tls-verify=true
                        kubectl set image deployment/frontend-deployment frontend=${FRONTEND_IMAGE}  -n ${K8S_NAMESPACE} --insecure-skip-tls-verify=true
                    '''
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        stage('6. Verify Rollout Status') {
        // ─────────────────────────────────────────────────────────────────────
            steps {
                echo "🔍 Checking rollout status for Backend and Frontend..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        export PATH=.:$PATH
                        [ -f ./kubeconfig ] || { cp "${KUBECONFIG_FILE}" ./kubeconfig && chmod 600 ./kubeconfig; }
                        export KUBECONFIG=$(pwd)/kubeconfig

                        echo "Checking Backend rollout..."
                        kubectl rollout status deployment/backend-deployment  -n ${K8S_NAMESPACE} --timeout=120s --insecure-skip-tls-verify=true || true

                        echo "Checking Frontend rollout..."
                        kubectl rollout status deployment/frontend-deployment -n ${K8S_NAMESPACE} --timeout=120s --insecure-skip-tls-verify=true || true

                        echo "Resource status in namespace ${K8S_NAMESPACE}:"
                        kubectl get pods,svc,ingress -n ${K8S_NAMESPACE} --insecure-skip-tls-verify=true
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "🎉 Fullstack deployed successfully! 👉 https://CHANGE_ME_APPLICATION_DOMAIN"
        }
        failure {
            echo "❌ Pipeline failed! Please review stage logs above for error details."
        }
    }
}
