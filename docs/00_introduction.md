# IT 중고장터 — 보안 취약점 실습 환경

> **⚠️ 주의** 이 앱은 의도적으로 취약하게 제작되었습니다. **격리된 VM 환경에서만** 운영하세요.

---

## 애플리케이션 소개

**IT 중고장터**는 중고 IT 기기 거래 마켓플레이스를 가장한 **보안 실습용 웹 애플리케이션**입니다.
실제 서비스처럼 보이는 UI 아래에 OWASP Top 10 기반 취약점들이 삽입되어 있어, 공격 기법을 안전한 환경에서 직접 실습할 수 있습니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| 인증 | JWT |
| 파일 업로드 | Multer |
| 인프라 | Docker Compose + HTTPS (자체 서명 인증서) |

---

## 접속 정보

### 호스트 PC에서 접속

| 서비스 | 주소 |
|--------|------|
| 웹 앱 (Frontend) | `https://localhost:55173` |
| API (Backend) | `https://192.168.1.20:5000` |
| MongoDB | `192.168.1.20:27017` |

> 브라우저 인증서 경고 → **고급** → **localhost(안전하지 않음)으로 이동** 클릭

### 기본 계정

| 역할 | ID | PW | 보안답변 |
|------|----|----|---------|
| 관리자 | `admin` | `admin` | `admin` |

---

## 주요 기능

- **회원** — 회원가입, 로그인, 비밀번호 찾기, 마이페이지
- **게시판** — 상품 등록(이미지 + 파일 첨부), 목록/상세 조회, 수정/삭제
- **채팅** — 판매자-구매자 간 1:1 채팅
- **관리자** — 게시글 숨김, 관리자 계정 생성

---

## 취약점 목록

| # | 취약점 | OWASP | 위치 | 난이도 |
|---|--------|-------|------|--------|
| 1 | Stored XSS | A03 Injection | `BoardDetail.jsx` | ⭐⭐ |
| 2 | Unrestricted File Upload | A05 Misconfiguration | `board.js`, `server.js` | ⭐⭐ |
| 3 | IDOR | A01 Access Control | `board.js` PUT/DELETE | ⭐⭐ |
| 4 | Plaintext Password | A02 Crypto Failures | `auth.js`, MongoDB | ⭐ |
| 5 | Sensitive Data Exposure | A02 Crypto Failures | `auth.js` find-password | ⭐⭐ |
| 6 | NoSQL Injection | A03 Injection | `auth.js` login | ⭐⭐⭐ |
| 7 | JWT Weak Secret + No Expiry | A07 Auth Failures | `auth.js`, `docker-compose.yml` | ⭐⭐⭐ |
| 8 | Path Traversal | A01 Access Control | `board.js` download | ⭐⭐⭐ |
| 9 | CSRF (XSS 연계) | A01 Access Control | 전체 | ⭐⭐⭐ |
| 10 | Brute Force | A07 Auth Failures | `auth.js` login | ⭐⭐ |

---

## 권장 실습 순서

```
1단계  #1 XSS  →  #2 File Upload
2단계  #3 IDOR  →  #4 Plaintext PW  →  #5 Sensitive Data  →  #10 Brute Force
3단계  #6 NoSQL Injection  →  #7 JWT 조작  →  #8 Path Traversal
4단계  #9 CSRF + 전체 취약점 연계 시나리오
```

---

## 추천 도구

| 도구 | 용도 |
|------|------|
| Burp Suite Community | 트래픽 캡처, Intruder, Repeater |
| DevTools (F12) | Network/Console/Application 탭 |
| jwt.io | JWT 디코딩 및 위조 |
| MongoDB Compass | DB 직접 조회 (포트 27017) |
| Python `requests` | 자동화 공격 스크립트 |
