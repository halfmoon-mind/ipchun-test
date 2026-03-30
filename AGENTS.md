# IPCHUN Agent Guidelines

이 문서는 AI 에이전트가 IPCHUN 프로젝트의 디자인 및 개발 작업을 수행할 때 따라야 할 규칙을 정의한다.

## Design System Usage (Pencil MCP)

### Required Workflow

1. `get_editor_state()` — 현재 열린 .pen 파일과 재사용 가능한 컴포넌트 목록 확인
2. `get_variables()` — 디자인 토큰 확인 (색상, 폰트, 라디우스)
3. `batch_get()` — 사용할 컴포넌트의 내부 구조 (descendant ID) 확인
4. `batch_design()` — 컴포넌트 인스턴스를 활용한 디자인 생성
5. `get_screenshot()` — 생성 결과 시각적 검증

### Component Usage Patterns

#### Buttons

아이콘을 숨기려면 `enabled: false`, 라벨 텍스트를 변경하려면 `content` override:

```javascript
btn=I(parent,{type:"ref",ref:"APQZU",descendants:{"nC0EH":{enabled:false},"ANFCL":{content:"Save"}}})
```

| Variant | ID | Icon ID | Label ID |
|---------|------|---------|----------|
| Primary | `APQZU` | `nC0EH` | `ANFCL` |
| Secondary | `at6HR` | `8UoFu` | `tpSvq` |
| Outline | `NbWNp` | `4xRmV` | `guG6m` |
| Ghost | `CKFGZ` | `mOtCr` | `jq1c7` |
| Destructive | `dzBQL` | `NMQ2a` | `xZxjI` |

#### Input Fields

```javascript
input=I(parent,{type:"ref",ref:"n6McX",width:"fill_container"})
U(input+"/A7ym2",{content:"Email"})
U(input+"/Sp5Dz",{content:"Enter your email..."})
U(input+"/oLGkr",{content:"We'll never share your email."})
```

| Component | ID | Label | Placeholder | Description |
|-----------|------|-------|-------------|-------------|
| InputGroup | `n6McX` | `A7ym2` | `Sp5Dz` | `oLGkr` |
| TextareaGroup | `AD41r` | `UaX6d` | `46G2p` | — |
| SelectGroup | `lh0jX` | `Almjp` | `uzZ9I` (value) | — |

#### Badges

```javascript
badge=I(parent,{type:"ref",ref:"8BcYQ",descendants:{"Rkv0Q":{content:"ACTIVE"}}})
```

| Variant | ID | Label ID |
|---------|------|----------|
| Default | `jDAYN` | `f7i6P` |
| Success | `8BcYQ` | `Rkv0Q` |
| Warning | `WuJlA` | `nC7Ef` |
| Error | `8laNo` | `L47XA` |

#### Card

Card는 3개의 슬롯을 가진다: `headerSlot`, `contentSlot`, `actionsSlot`.

```javascript
card=I(parent,{type:"ref",ref:"Qn54U",width:"fill_container"})
U(card+"/Ajkyf",{content:"Account Settings"})
U(card+"/KqxJK",{content:"Manage your profile and preferences."})
// contentSlot에 새 콘텐츠 삽입
formField=I(card+"/BCuSM",{type:"ref",ref:"n6McX",width:"fill_container"})
// actionsSlot 버튼 텍스트 변경
U(card+"/ptLiw/guG6m",{content:"Cancel"})
U(card+"/Mk6PM/ANFCL",{content:"Save Changes"})
```

#### Sidebar

```javascript
sidebar=I(parent,{type:"ref",ref:"OFn9i",height:"fill_container"})
// 네비게이션 아이템 추가
navItem=I(sidebar+"/kDYJF",{type:"ref",ref:"mCCrd",width:"fill_container",descendants:{"slnTJ":{iconFontName:"calendar"},"v4vEO":{content:"Schedule"}}})
```

#### Modal

```javascript
modal=I(parent,{type:"ref",ref:"zjiEa"})
U(modal+"/V5hlM",{content:"Delete Item"})
U(modal+"/JMsar",{content:"Are you sure you want to delete this item?"})
// contentSlot에 콘텐츠 추가
content=I(modal+"/K2HXk",{type:"text",content:"This action cannot be undone.",fontFamily:"Inter",fontSize:13,fill:"$--foreground"})
```

### Screen Layout Templates

#### Dashboard (Sidebar + Content)

```javascript
screen=I(document,{type:"frame",name:"Dashboard",layout:"horizontal",width:1440,height:"fit_content(900)",fill:"$--background",placeholder:true})
sidebar=I(screen,{type:"ref",ref:"OFn9i",height:"fill_container"})
main=I(screen,{type:"frame",layout:"vertical",width:"fill_container",height:"fill_container(900)",padding:32,gap:24})
```

#### Header + Content

```javascript
screen=I(document,{type:"frame",layout:"vertical",width:1200,height:"fit_content(800)",fill:"$--background",placeholder:true})
header=I(screen,{type:"frame",layout:"horizontal",width:"fill_container",height:64,padding:[0,24],alignItems:"center",justifyContent:"space_between",stroke:{align:"inside",fill:"$--border",thickness:{bottom:1}}})
content=I(screen,{type:"frame",layout:"vertical",width:"fill_container",height:"fit_content(736)",padding:32,gap:24})
```

### Design Rules

1. **항상 `$--variable` 토큰을 사용한다.** 색상, 폰트, 라디우스에 하드코딩 금지.
2. **cornerRadius는 항상 0.** 에디토리얼 스타일의 핵심.
3. **Playfair Display는 제목(italic, 600)에만.** 본문/UI는 Inter.
4. **fill_container / fit_content 우선.** 하드코딩 수치보다 dynamic sizing 선호.
5. **기존 컴포넌트를 ref로 재사용.** 새로 만들기 전에 기존 컴포넌트 확인.
6. **placeholder 워크플로우 준수.** 작업 시작 시 `placeholder:true`, 완료 시 해제.
7. **batch_design은 최대 25 ops.** 큰 작업은 논리적 섹션별로 분할.
8. **매 작업 후 get_screenshot으로 검증.**

### Typography Scale

| Level | Font | Size | Weight | Style | LS |
|-------|------|------|--------|-------|----|
| Page Title | Playfair Display | 42px | 600 | italic | -1 |
| Section Title | Playfair Display | 22px | 600 | italic | 0.5 |
| Card Title | Playfair Display | 18px | 600 | italic | 0 |
| Body | Inter | 14px | 400 | normal | 0 |
| Label / Nav | Inter | 13px | 500 | normal | 0 |
| Meta | Inter | 12px | 500 | normal | 0 |
| Table Header | Inter | 11px | 600 | normal | 0.5 |
| Badge | Inter | 9px | 700 | normal | 1 |

### Spacing Reference

| Context | Gap | Padding |
|---------|-----|---------|
| Screen sections | 24–32 | — |
| Card grid | 16–24 | — |
| Form fields (vertical) | 16 | — |
| Button groups | 12 | — |
| Inside cards | — | 24 |
| Inside buttons | — | [10, 20] |
| Inside inputs | — | [0, 12] |
| Page content area | — | 32 |
| Sidebar items | 2 | [10, 16] |

### Icon System

- **Font:** Lucide (`iconFontFamily: "lucide"`)
- **Size:** 16–18px (UI icons), 12px (inline indicators)
- **Common icons:** `layout-dashboard`, `calendar`, `users`, `ticket`, `settings`, `search`, `plus`, `x`, `check`, `chevron-down`, `trash-2`, `edit`, `mail`, `bell`

## Frontend Code Rules

- 한 viewport에 하나의 컴포지션.
- 브랜드(IPCHUN)가 hero-level로 보여야 함.
- 표현적 폰트 사용 (Inter 단독 사용 금지, Playfair Display 병행).
- 카드는 사용자 인터랙션 컨테이너일 때만 사용.
- 섹션당 하나의 역할: one headline, one supporting sentence.
- 보라색/다크모드 편향 금지. 따뜻한 뉴트럴 팔레트 유지.
- Tailwind CSS v4에서는 디자인 토큰을 CSS variable로 매핑하여 사용.
