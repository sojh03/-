# MarketProject — Claude 인수인계 문서

> 이 문서는 새 Claude 대화에서 프로젝트를 즉시 파악하고 안전하게 작업하기 위한 문서입니다.

---

## 프로젝트 개요

**IT 중고장터** — 보안 교육용 의도적 취약 웹앱 (DVWA 스타일).  
10가지 취약점이 **의도적으로** 심어져 있습니다. 고치려 하지 마세요.

- **스택**: React + Vite (프론트) / Express + MongoDB (백엔드) / Docker Compose
- **목적**: 웹 보안 취약점 실습 및 워크스루 학습

---

## 인프라 구성

| 구분 | 주소 |
|------|------|
| 호스트 PC | 192.168.0.10 |
| Windows 10 VM | 192.168.1.20 |
| 프론트엔드 접속 (호스트) | https://localhost:55173 |
| 백엔드 API (VM 내부) | https://localhost:5000/api |
| 포트포워딩 | localhost:2222 → VM:22 (SSH) |
| 포트포워딩 | localhost:55173 → VM:5173 (Frontend) |
| 포트포워딩 | localhost:33189 → VM:3189 |

### VM SSH 접속
```bash
ssh -i ~/.ssh/vm_key -p 2222 user@localhost
# 비밀번호 없음, ed25519 키 인증
```

### 프로젝트 위치
- **로컬 소스**: `E:\Antigravity\MarketProject\`
- **VM 실행 위치**: `C:\MarketProject\`
- **VM Docker**: `docker-compose` 로 3개 컨테이너 실행 중

### Docker 컨테이너
```
market_mongodb   — MongoDB (포트 27017)
market_backend   — Express HTTPS (포트 5000)
market_frontend  — Vite dev server (포트 5173)
```

### DB 접속
- **데이터베이스명**: `market_db` (중요: `market` 아님!)
- **기본 계정**: admin / admin (Admin 역할), test / test, test2 / test2

```bash
docker exec market_mongodb mongosh market_db --eval "db.users.find({},{userId:1,role:1,password:1})"
```

---

## 파일 배포 워크플로 (중요!)

VM은 볼륨 마운트 없이 이미지에 소스를 베이크합니다.  
**파일 수정 후 반드시 아래 순서로 진행해야 합니다.**

```bash
# 1. 로컬 → VM SCP (파일별 또는 폴더별)
scp -i ~/.ssh/vm_key -P 2222 "e:/Antigravity/MarketProject/frontend/vite.config.js" "user@localhost:C:/MarketProject/frontend/vite.config.js"

# pages 폴더 전체
scp -i ~/.ssh/vm_key -P 2222 -r "e:/Antigravity/MarketProject/frontend/src/pages" "user@localhost:C:/MarketProject/frontend/src/"

# 2. VM에서 Docker 재빌드
ssh -i ~/.ssh/vm_key -p 2222 user@localhost "cd C:\\MarketProject && docker-compose up -d --build frontend"
```

### SCP 경로 주의사항 (과거 사고 원인)
```bash
# 잘못된 예 — src/src/ 중첩 구조 생성됨
scp -r ".../frontend/src" "user@localhost:C:/MarketProject/frontend/src"

# 올바른 예 — src 내용물을 src 안에 넣기
scp -r ".../frontend/src/pages" "user@localhost:C:/MarketProject/frontend/src/"
scp ".../frontend/src/api.js" "user@localhost:C:/MarketProject/frontend/src/"
```

---

## 의도적 취약점 목록 (절대 수정 금지)

| # | 취약점 | 위치 |
|---|--------|------|
| 1 | Stored XSS | `frontend/src/pages/BoardDetail.jsx` L132, L143 — `dangerouslySetInnerHTML` |
| 2 | Unrestricted File Upload | `backend/routes/board.js` — multer fileFilter 없음, `server.js` — X-Content-Type-Options 제거 |
| 3 | IDOR | `backend/routes/board.js` PUT/DELETE — 소유권 확인 없음 |
| 4 | Plaintext Password | `backend/routes/auth.js` — bcrypt 없이 평문 저장/비교 |
| 5 | Sensitive Data Exposure | `backend/routes/auth.js` `/find-password` — 비밀번호 평문 응답 |
| 6 | NoSQL Injection | `backend/routes/auth.js` login — `{userId, password}` 그대로 MongoDB 쿼리 |
| 7 | JWT Weak Secret + No Expiry | `backend/routes/auth.js` — secret: `'secret'`, expiresIn 없음 |
| 8 | Path Traversal | `backend/routes/board.js` `/download/:filename` — 경로 검증 없음 |
| 9 | CSRF via XSS | XSS + localStorage JWT 탈취 조합 |
| 10 | Brute Force | 로그인 엔드포인트 rate limit 없음 |

### 핵심 취약 코드 위치

**backend/routes/auth.js**
```js
const JWT_SECRET = process.env.JWT_SECRET || 'secret'; // [VULN #7]

// 로그인: NoSQL Injection 가능 [VULN #6]
const user = await User.findOne({ userId: userId, password: password });

// JWT: expiresIn 없음 [VULN #7]
const token = jwt.sign({ id, userId, role }, JWT_SECRET);
```

**docker-compose.yml**
```yaml
environment:
  - JWT_SECRET=secret   # 반드시 'secret'이어야 JWT 취약점 동작
```

**frontend/src/pages/BoardDetail.jsx**
```jsx
// [VULN #1] XSS
<h1 dangerouslySetInnerHTML={{__html: post.title}}></h1>
<p dangerouslySetInnerHTML={{__html: post.content}}></p>
```

---

## vite.config.js (핵심 — 없으면 API 전체 404)

```js
// frontend/vite.config.js
proxy: {
  '/api':     { target: 'https://market_backend:5000', changeOrigin: true, secure: false },
  '/uploads': { target: 'https://market_backend:5000', changeOrigin: true, secure: false }
}
```

이 파일이 없거나 proxy 블록이 없으면 프론트에서 API 호출 전체 실패 → 하얀 화면.

---

## api.js 구조

```js
// frontend/src/api.js
const API_BASE = '/api';       // Vite proxy 통해 백엔드로 전달
const UPLOADS_BASE = '/uploads';
export { api, API_BASE, UPLOADS_BASE };
```

하드코딩된 `https://localhost:5000/api` 방식은 구버전. 현재는 상대경로 + proxy.

---

## 워크스루 문서

`docs/` 폴더에 있음. 마크다운 프리뷰로 볼 것.

| 파일 | 내용 |
|------|------|
| `00_introduction.md` | 앱 소개, 취약점 목록, 실습 순서 |
| `walkthrough_01_02_xss_fileupload.md` | Stored XSS + 파일 업로드 |
| `walkthrough_03_04_idor_plaintext.md` | IDOR + 평문 비밀번호 |
| `walkthrough_05_06_sensitive_nosql.md` | 민감 정보 노출 + NoSQL 인젝션 |
| `walkthrough_07_08_jwt_pathtraversal.md` | JWT 취약 + 경로 탐색 |
| `walkthrough_09_10_csrf_bruteforce.md` | CSRF + 브루트 포스 |

---

## 주요 장애 이력 (같은 실수 방지)

1. **SCP로 src/src/ 중첩 구조** — SCP 목적지 경로를 `frontend/src`로 하면 중첩됨. 항상 내용물 단위로 전송.
2. **vite.config.js proxy 누락** — 이 파일이 VM에 구버전으로 있으면 API 전체 404. 소스 수정 시 이 파일도 반드시 SCP.
3. **DB 이름 혼동** — 백엔드는 `market_db` 사용. mongosh로 직접 작업 시 반드시 `mongosh market_db`.
4. **docker-compose JWT_SECRET** — env var가 코드 fallback을 덮어씀. `JWT_SECRET=secret`이어야 취약점 동작.
5. **Vite는 dev 모드** — 볼륨 마운트 없음. 소스 수정 → SCP → `docker-compose up -d --build frontend` 필수.

---

## Git 백업

`E:\Antigravity\MarketProject\` 에 git repo 초기화됨 (master 브랜치, 커밋 1개).  
원격 저장소 미설정 — 로컬 백업만. GitHub push 원하면 remote 추가 후 push.

```bash
cd "e:/Antigravity/MarketProject"
git log --oneline  # 현재 커밋 확인
```
