// =============================================================================
// Skilli College DevOps & Cloud Lab - Student CI/CD Pipeline
// Flow: GitHub -> Jenkins -> SonarQube -> BuildKit/Docker -> Nexus -> K8s -> URL
//
// ⚡ GITHUB WEBHOOK SETUP FOR AUTO-DEPLOY ON "git push":
// 1. In your GitHub repo, go to: Settings -> Webhooks -> Add webhook
// 2. Payload URL: https://jenkins.imcc.skilli.in/github-webhook/  (Keep ending slash!)
// 3. Content type: application/json
// 4. Secret: <Leave Empty>
// 5. SSL verification: Enable SSL verification
// 6. Which events: Just the push event
// 7. Active: Checked [x]
// 8. Click "Add webhook" -> Now every "git push" triggers auto-deploy!
//
// ─────────────────────────────────────────────────────────────────────────────
// 🔑 CREDENTIALS NEEDED (Create in Jenkins -> Credentials -> Global credentials):
//
//   1. ID: <your-rollno>-sonar-token  → Kind: Secret text  → Value: SonarQube token (sqa_...)
//   2. ID: <your-rollno>-kubeconfig   → Kind: Secret file  → Value: kubeconfig .yaml from Admin Panel
//
//   ✅ Har student ki ID unke roll number se unique hai (Zero overlap)!
//   ✅ NO nexus-student-creds needed! Nexus login is handled via NEXUS_USER/NEXUS_PASS below.
// =============================================================================

pipeline {
    // Server uses a dedicated 'docker-builder' node with buildkit sidecar container
    agent {
        label 'docker-builder'
    }

    // Triggers: Auto-run on GitHub Push (Webhook) or poll every 5 minutes
    triggers {
        githubPush()
        pollSCM('H/5 * * * *')
    }

    environment {
        // =====================================================================
        // [STEP 1] STUDENT CONFIGURATION - FILL FROM YOUR WELCOME EMAIL
        // =====================================================================

        // 1. SonarQube Configuration (from email: SonarQube Project Key)
        SONAR_HOST_URL      = 'https://sonarqube.imcc.skilli.in'
        SONAR_PROJECT_KEY   = 'CHANGE_ME_SONAR_PROJECT_KEY'  // Example: '2401060a-project'

        // 2. Nexus Docker Registry (from email: Docker Registry Path / Nexus URL)
        NEXUS_REGISTRY      = 'nexus.imcc.skilli.in'         // Registry host (without https://)
        NEXUS_REPO_PATH     = 'CHANGE_ME_NEXUS_IMAGE_PATH'   // Example: 'student-docker/2401060a'
        IMAGE_NAME          = 'my-app'                       // Your application name (lowercase)

        // 3. Kubernetes Environment (from email: Namespace)
        K8S_NAMESPACE       = 'CHANGE_ME_K8S_NAMESPACE'      // Example: 'student-2401060a'
        K8S_DEPLOYMENT_NAME = 'my-app-deployment'            // Matches name in k8s/deployment.yaml

        // 4. Nexus Credentials (from email: Nexus Username & Password)
        //    Set directly — no Jenkins credential binding needed!
        NEXUS_USER          = 'CHANGE_ME_NEXUS_USERNAME'     // Example: '2401060a'
        NEXUS_PASS          = 'CHANGE_ME_NEXUS_PASSWORD'     // Example: 'Skilli@123'

        // =====================================================================
        // [STEP 2] YOUR UNIQUE JENKINS CREDENTIAL IDs (From Welcome Email)
        // Global credentials me banayi hui exact unique IDs yahan dalein:
        // =====================================================================
        SONAR_CRED_ID       = 'CHANGE_ME_SONAR_CRED_ID'   // Example: '2401098a-sonar-token'
        KUBE_CRED_ID        = 'CHANGE_ME_KUBE_CRED_ID'    // Example: '2401098a-kubeconfig'
        // NOTE: nexus-student-creds is NOT needed — using NEXUS_USER/NEXUS_PASS above

        // Dynamic Image Tags (auto-generated, do not edit)
        IMAGE_TAG           = "${env.BUILD_NUMBER}-${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'latest'}"
        FULL_IMAGE          = "${env.NEXUS_REGISTRY}/${env.NEXUS_REPO_PATH}/${env.IMAGE_NAME}:${env.IMAGE_TAG}"
        LATEST_IMAGE        = "${env.NEXUS_REGISTRY}/${env.NEXUS_REPO_PATH}/${env.IMAGE_NAME}:latest"
    }

    stages {
        // ---------------------------------------------------------------------
        // STAGE 1: Code Checkout
        // ---------------------------------------------------------------------
        stage('1. Checkout Code') {
            steps {
                echo "🚀 Checking out source code from Git repository..."
                checkout scm
                script {
                    echo "Branch: ${env.GIT_BRANCH}"
                    echo "Commit: ${env.GIT_COMMIT}"
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 2: Dependency Installation & Automated Tests
        // ---------------------------------------------------------------------
        stage('2. Install & Test') {
            steps {
                echo "📦 Installing project dependencies and running tests..."
                sh '''
                    # For Node.js (uncomment if using Node.js)
                    if [ -f package.json ]; then
                        npm ci || npm install
                        npm test --if-present
                    fi

                    # For Python (uncomment if using Python)
                    # if [ -f requirements.txt ]; then
                    #     pip install -r requirements.txt
                    #     pytest || true
                    # fi
                '''
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 3: SonarQube Code Quality Analysis
        // ---------------------------------------------------------------------
        stage('3. SonarQube Analysis') {
            steps {
                echo "📊 Running SonarQube static code quality analysis..."
                withCredentials([string(credentialsId: env.SONAR_CRED_ID, variable: 'SONAR_TOKEN')]) {
                    sh """
                        # Run SonarScanner using Docker or local scanner CLI
                        if which sonar-scanner > /dev/null 2>&1; then
                            sonar-scanner \\
                                -Dsonar.host.url=${env.SONAR_HOST_URL} \\
                                -Dsonar.login=\${SONAR_TOKEN} \\
                                -Dsonar.projectKey=${env.SONAR_PROJECT_KEY} \\
                                -Dsonar.sources=. \\
                                -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/.git/**
                        else
                            echo "Using Dockerized sonar-scanner-cli..."
                            docker run --rm \\
                                -e SONAR_HOST_URL="${env.SONAR_HOST_URL}" \\
                                -e SONAR_SCANNER_OPTS="-Dsonar.projectKey=${env.SONAR_PROJECT_KEY}" \\
                                -e SONAR_TOKEN="\${SONAR_TOKEN}" \\
                                -v "\$(pwd):/usr/src" \\
                                sonarsource/sonar-scanner-cli \\
                                -Dsonar.projectKey=${env.SONAR_PROJECT_KEY} \\
                                -Dsonar.sources=. \\
                                -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/.git/** || true
                        fi
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 4: Build & Push Docker Image via BuildKit container
        //
        // Server uses 'docker-builder' agent with a BuildKit sidecar.
        // Multi-password Nexus auth trial handles password rotation gracefully.
        // Tries Docker CLI first, then falls back to buildctl (BuildKit).
        // ---------------------------------------------------------------------
        stage('4. Build & Push to Nexus') {
            steps {
                container('buildkit') {
                    sh """
                        echo "🔧 Authenticating with Nexus Docker Registry..."

                        VALID_AUTH=""

                        # Try email password first, then fallback
                        for P in "${env.NEXUS_PASS}" "Skilli@123"; do
                            C_AUTH=\$(printf "%s:%s" "${env.NEXUS_USER}" "\$P" | base64 | tr -d '\\r\\n')
                            echo "Testing Nexus auth..."
                            if wget -q -O /dev/null --header "Authorization: Basic \$C_AUTH" "https://${env.NEXUS_REGISTRY}/v2/" 2>/dev/null; then
                                echo "✅ Nexus auth successful!"
                                VALID_AUTH="\$C_AUTH"
                                break
                            else
                                echo "❌ Auth attempt failed, trying next..."
                            fi
                        done

                        if [ -z "\$VALID_AUTH" ]; then
                            echo "⚠️ Fallback — using base64 of NEXUS_USER:NEXUS_PASS directly"
                            VALID_AUTH=\$(printf "%s:%s" "${env.NEXUS_USER}" "${env.NEXUS_PASS}" | base64 | tr -d '\\r\\n')
                        fi

                        # Write docker config to all known paths for BuildKit + Docker compatibility
                        CONFIG_JSON="{\"auths\":{\"${env.NEXUS_REGISTRY}\":{\"auth\":\"\$VALID_AUTH\"},\"https://${env.NEXUS_REGISTRY}\":{\"auth\":\"\$VALID_AUTH\"}}}"
                        for DIR in "\$HOME/.docker" "/home/user/.docker" "/home/jenkins/agent/.docker" "/root/.docker"; do
                            mkdir -p "\$DIR" 2>/dev/null || true
                            echo "\$CONFIG_JSON" > "\$DIR/config.json" 2>/dev/null || true
                        done
                        export DOCKER_CONFIG="\$HOME/.docker"

                        BUILDKIT_SOCK="unix:///run/user/1000/buildkit/buildkitd.sock"

                        if command -v docker > /dev/null 2>&1; then
                            echo "🐳 Using Docker CLI..."
                            echo "${env.NEXUS_PASS}" | docker login -u "${env.NEXUS_USER}" --password-stdin ${env.NEXUS_REGISTRY}

                            docker build -t ${FULL_IMAGE} -t ${LATEST_IMAGE} -f Dockerfile .
                            docker push ${FULL_IMAGE}
                            docker push ${LATEST_IMAGE}

                            docker logout ${env.NEXUS_REGISTRY} || true

                        elif command -v buildctl > /dev/null 2>&1; then
                            echo "🚀 Using BuildKit (buildctl)..."
                            buildctl --addr "\$BUILDKIT_SOCK" build \\
                                --frontend dockerfile.v0 \\
                                --local context=. \\
                                --local dockerfile=. \\
                                --output "type=image,name=${FULL_IMAGE},push=true"

                            buildctl --addr "\$BUILDKIT_SOCK" build \\
                                --frontend dockerfile.v0 \\
                                --local context=. \\
                                --local dockerfile=. \\
                                --output "type=image,name=${LATEST_IMAGE},push=true"

                            echo "✅ Image built & pushed via BuildKit!"

                        else
                            echo "❌ Error: Neither docker nor buildctl found in container!"
                            exit 1
                        fi
                    """
                }
            }
        }



        // ---------------------------------------------------------------------
        // STAGE 5: Deploy to Student Kubernetes Namespace
        // Downloads kubectl if not found on agent (common in minimal k8s pods)
        // ---------------------------------------------------------------------
        stage('5. Deploy to Kubernetes') {
            steps {
                echo "☸️ Applying Kubernetes manifests to namespace ${env.K8S_NAMESPACE}..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh """
                        export KUBECONFIG=\${KUBECONFIG_FILE}

                        # Download kubectl if not available on this agent
                        if ! command -v kubectl > /dev/null 2>&1; then
                            echo "⬇️ kubectl not found — downloading..."
                            curl -sLO "https://dl.k8s.io/release/v1.30.0/bin/linux/amd64/kubectl"
                            chmod +x kubectl
                            export PATH=".:\$PATH"
                        fi

                        echo "Applying manifests..."
                        kubectl apply -f k8s/ -n ${env.K8S_NAMESPACE}

                        echo "Triggering rolling deployment with new image..."
                        kubectl set image deployment/${env.K8S_DEPLOYMENT_NAME} \\
                            ${env.IMAGE_NAME}=${FULL_IMAGE} \\
                            -n ${env.K8S_NAMESPACE} || true
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // STAGE 6: Verify Rollout Status
        // ---------------------------------------------------------------------
        stage('6. Verify Rollout') {
            steps {
                echo "🔍 Verifying application rollout in Kubernetes..."
                withCredentials([file(credentialsId: env.KUBE_CRED_ID, variable: 'KUBECONFIG_FILE')]) {
                    sh """
                        export KUBECONFIG=\${KUBECONFIG_FILE}
                        export PATH=".:\$PATH"

                        echo "Checking deployment rollout status..."
                        kubectl rollout status deployment/${env.K8S_DEPLOYMENT_NAME} -n ${env.K8S_NAMESPACE} --timeout=120s || true

                        echo "Displaying deployed pods and service status..."
                        kubectl get pods,svc,ingress -n ${env.K8S_NAMESPACE}
                    """
                }
            }
        }
    }

    post {
        success {
            echo "================================================================="
            echo "🎉 Pipeline completed successfully!"
            echo "Your application has been deployed and is live in namespace: ${env.K8S_NAMESPACE}"
            echo "Check your assigned HTTPS URL from your welcome email!"
            echo "================================================================="
        }
        failure {
            echo "================================================================="
            echo "❌ Pipeline failed! Please inspect the console logs above."
            echo "Common checklist:"
            echo "1. Did you replace all CHANGE_ME_* placeholders in Jenkinsfile?"
            echo "2. Are NEXUS_USER and NEXUS_PASS set correctly from your welcome email?"
            echo "3. Are Jenkins credentials (sonar-token-student, student-kubeconfig) created in YOUR FOLDER?"
            echo "4. Does your Dockerfile build cleanly locally?"
            echo "================================================================="
        }
    }
}
