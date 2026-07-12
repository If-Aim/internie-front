# Internie Frontend

실무 미션의 수행 과정과 결과를 기반으로 지원자의 실무 역량을 확인할 수 있는 채용 플랫폼 **인터니(Internie)**의 프론트엔드 프로젝트입니다.

기업은 실무 미션을 등록하고 지원자의 단계별 산출물과 수행 과정을 확인할 수 있으며, 지원자는 미션 참여와 활동 기록을 관리할 수 있습니다.

## 기술 스택

- React
- TypeScript
- Vite
- React Router
- i18next
- CSS
- Vercel

## 주요 기능

### 랜딩페이지

- 인터니 서비스 소개
- 반응형 모바일·데스크톱 UI
- 실무 미션 기반 채용 프로세스 안내
- 자주 묻는 질문
- 기업 도입 문의 전송

### 인증

- 일반 로그인 및 회원가입
- 카카오 로그인
- 구글 로그인
- 이메일 인증
- 아이디 찾기
- 비밀번호 재설정
- Access Token 자동 갱신

### 온보딩

- 사용자 유형 선택
- 학생 및 기업 정보 입력
- 관심 직무와 관심 기업 설정
- 제휴 기관 인증

### 학생 서비스

- 일정 및 활동 관리
- 질문 확인
- 음성 기록 및 전사
- 미션 조회 및 제출
- 출석 인증
- 리더보드
- 공지사항
- 프로필 관리
- 수료증 및 관리자 파일 확인

### 관리자 서비스

- 사용자 관리
- 학생 인증 승인 및 거절
- 과제 및 미션 관리
- 제출물 평가
- 출석 관리
- 공지사항 관리
- 리더보드 관리
- 관리자 파일 업로드
- 제휴 기관별 학생 관리

## 실행 환경

다음 환경이 필요합니다.

- Node.js 22 이상
- npm
- 실행 중인 Internie Backend API

## 설치

저장소를 복제한 뒤 의존성을 설치합니다.

```bash
git clone https://github.com/If-Aim/internie-front.git
cd internie-front
npm install
```


## 개발 서버 실행

```bash
npm run dev
```

기본 접속 주소는 다음과 같습니다.

```text
http://localhost:5173
```

## 프로젝트 구조

```text
src/
├── api/
│   ├── client.ts
│   ├── ea.ts
│   ├── notificationSocket.ts
│   └── organizaionClient.ts
├── assets/
├── i18n/
├── pages/
│   ├── admin/
│   ├── auth/
│   ├── landing/
│   ├── privacy/
│   └── student/
├── styles/
├── utils/
├── App.tsx
└── main.tsx
```

### 주요 디렉터리

| 경로 | 설명 |
| --- | --- |
| `src/api` | 백엔드 API 요청 함수와 응답 타입 |
| `src/assets` | 이미지, 아이콘, 폰트 등의 정적 리소스 |
| `src/i18n` | 한국어 및 영어 번역 리소스 |
| `src/pages` | 기능과 역할별 페이지 컴포넌트 |
| `src/styles` | 공통 스타일 |
| `src/utils` | 날짜, 파일, SEO 등의 유틸리티 |

## 주요 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | 인터니 랜딩페이지 |
| `/login` | 로그인 |
| `/onboarding` | 사용자 온보딩 |
| `/student/*` | 학생 서비스 |
| `/admin/*` | 전체 관리자 서비스 |
| `/admin-client/*` | 제휴 기관 관리자 서비스 |

일부 경로는 로그인 상태와 사용자 권한에 따라 접근이 제한됩니다.

## API 요청 구조

공통 API 요청은 `src/api/client.ts`에서 관리합니다.

주요 기능은 다음과 같습니다.

- API 기본 주소 조합
- JSON 요청 및 응답 처리
- 파일 업로드와 다운로드
- JWT Authorization 헤더 처리
- Access Token 만료 확인
- Refresh Token을 통한 자동 갱신
- `401`, `403` 응답 시 재요청
- 공통 API 오류 처리

로그인이 필요 없는 공개 API는 `apiPublic()` 또는 `apiPublicJson()`을 사용합니다.

로그인이 필요한 API는 `api()`를 사용합니다.

정상적으로 접수되면 백엔드는 `204 No Content`를 반환합니다.

## 다국어

`react-i18next`를 사용하여 한국어와 영어를 지원합니다.

번역 리소스는 `src/i18n` 내부에서 관리하며, 화면에 직접 문자열을 하드코딩하기보다 번역 키를 사용하는 것을 권장합니다.

## 배포

프로덕션 프론트는 Vercel을 통해 배포합니다.

```text
https://internie.com
https://www.internie.com
```

Vercel 배포 전 다음 항목을 확인해야 합니다.

- `VITE_API_BASE_URL` 환경변수
- 백엔드 CORS 허용 도메인
- SPA 라우팅 Rewrite 설정
- 운영 도메인 연결
- HTTPS 인증서
- `robots.txt`
- `sitemap.xml`
- canonical URL
- favicon 및 SEO 메타데이터

```

## 협업 규칙

- 기능 단위로 브랜치를 생성합니다.
- API 응답 타입을 `any`로 처리하지 않습니다.
- 공통 API 요청은 `client.ts`를 사용합니다.
- 반복되는 UI와 로직은 컴포넌트 또는 Hook으로 분리합니다.
- 사용자에게 표시되는 문자열은 번역 키 사용을 우선합니다.
- 배포 전 `lint`와 `build`를 실행합니다.

## 권장 확인 명령어

```bash
npm run lint
npm run build
```

## License

This project is maintained by AIM.

© 2026 AIM. All rights reserved.