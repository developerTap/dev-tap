---
lastmod: 2025-03-02
tags:
  - typescript
  - tsconfig
  - module
  - resolution
  - cjs
  - esm
---

이번 글에선 타입 스크립트에서 `modules`의 기초가 되는 `Module Resolution`이 어떠한 배경으로 나오게 되는지 알기 위해 **CommonJS(CJS)와 ECMAScript 모듈(ESM)의 차이**, 그리고 **타입스크립트가 모듈을 어떻게 해석하고 변환하는지** 상세 다룰 예정이다.

**자바스크립트에서의 모듈 개념의 발전**을 시작으로, **타입스크립트가 모듈을 해석하는 과정**과 **트랜스파일링(컴파일 시점 변환) 시 고려해야 할 사항**을 설명한다. 또한 **Node.js와 번들러(Webpack 등)에서의 모듈 실행 환경의 차이점**, 그리고 **타입스크립트에서 사용할 수 있는 다양한 모듈 설정 값들(module 옵션)** 에 대해서도 분석해보자.

### **배경**

자바스크립트는 브라우저에서만 실행되던 초기에는 모듈이 없었지만 HTML에서 스크립트 태그를 활용해 웹 페이지 내에서 자바스크립트 파일을 여러 파일로 분할하는 것이 가능했다.

```html
<html>
  <head>
    <script src="a.js"></script>
    <script src="b.js"></script>
  </head>
  <body></body>
</html>
```

각 파일에는 고유한 범위를 부여하면서 다른 파일에 코드 조각들을 사용할 수 있는 방법을 제공하여 해결하는 모든 시스템을 `모듈 시스템`이라고 부를 수 있게 됐다.

많은 모듈 시스템이 있지만 대표적으로 CommonJS(CJS와 ECMAScript 모듈(ESM)을 살펴보자. ESM은 언언어에 내장된 모듈 시스템으로 최신 브라우저와 Node.js v12 이상부터 지원된다. `import/export` 구문을 사용할 수 있고, CJS는 ESM이 사용되기 전 원래 Node.js에서 제공되던 모듈 시스템이며 일반 자바스크립트 객체와 `exports/require` 함수를 사용한다.(아직 ESM과 CJS는 Node.js에서 지원되고 있는 상태다)

이후 타입 스크립트가 등장하여 각 모듈 시스템에서 컴파일되어야하는 작업이 복잡해졌다.

### **모듈과 관련된 타입 스크립트 작업**

타입 스크립트의 목표는 **컴파일 시점에 오류를 잡아주는 것**. 그런데 모듈을 사용할 때는, **런타임 환경**이 어떻게 동작하는지 알아야 오류를 방지할 수 있다. 특히 **모듈 시스템**을 사용하면 컴파일러가 추가로 확인해야 할 것들이 많다.

import hello from "greeting-module";
hello('안녕하세요');

이 코드를 컴파일러가 이해하려면 `모듈을 어떻게 가져올 것인지 확인`해야한다. 다음 7가지 체크리스트를 살펴보자.

#### 🔍 **1) 모듈을 어떻게 로드할지 결정**

타입스크립트는 **두 가지 방식** 중 하나로 모듈을 로드할 수 있다.

- 타입스크립트 파일(`.ts`)을 직접 로드할지?
- 변환된 자바스크립트 파일(`.js`)을 로드할지?

👉 컴파일러는 프로젝트 설정을 보고, 어떤 방식으로 로드할지 판단해야 한다.

#### 🔍 **2) 모듈의 종류 확인**

모듈 시스템에는 **CommonJS(CJS)**, **ES Modules(ESM)** 등 여러 가지 방식이 있다. 컴파일러는 `greeting-module`이 **어떤 형식**의 모듈인지 확인해야한다.

#### 🔍 **3) `ts` → `js` 변환 후 모듈 방식 결정**

타입스크립트가 변환된 `hello` 함수의 코드가

- **CommonJS(`require`)** 로 변환될지?
- **ES Modules(`import`)** 로 변환될지?

👉 `tsconfig.json`에서 `"module": "commonjs"`, `"module": "esnext"` 등의 설정에 따라 결정된다.

#### 🔍 **4) 모듈 파일을 어디서 찾을지 결정**

`greeting-module`이 실제로 어디에 있는지 확인해야 한다. 컴파일러는 **Node.js의 모듈 검색 방식**을 따라감.

1. `node_modules/`에서 찾음
2. `paths` 설정이 있으면 해당 경로에서 찾음
3. 상대 경로(`./modules/greeting-module.js` 같은 것)를 확인함

#### 🔍 **5) 찾은 파일의 모듈 종류 확인**

모듈이 `greeting-module.js`, `greeting-module.ts`, `index.js` 등 여러 형태로 있을 수 있는데, 컴파일러는 찾은 파일이 **어떤 형식의 모듈인지** 다시 체크해야 한다. [🔍 **2) 모듈의 종류 확인**](#2-모듈의-종류-확인)을 다시 수행.

#### 🔍 **6) 모듈 간 호환성 체크**

- `greeting-module`이 **CommonJS(CJS) 모듈**인데  
   → `import`(ESM 방식)으로 불러오면 **호환될까?**
- 반대로 **ESM 모듈**을 `require()`로 가져오면 **문제없을까?**

👉 이걸 확인하지 않으면, 실행 시 에러가 발생할 수도 있다.

#### 🔍 **7) `hello`가 정확히 어떤 함수인지 확인**

- `greeting-module`이 `hello`라는 함수를 정말 내보내는지?
- 만약 `export default helloFunc`라면? `hello`가 `helloFunc`을 가리키는 게 맞는지?

👉 타입스크립트는 모듈 내부 구조를 분석해서 **정확한 타입을 할당**해야 한다.

위 모든 체크 리스트는 호스트의 특성, 즉 모듈 로드를 지시하기 위해 최종적으로 트랜스파일링된 자바스크립트를 소비하는 시스템으로 일반적으로 런타임(ex: node.js) 또는 번들러(ex: webpack)에 따라 결정된다.

이제 타입스크립트는 위 내용을 기반으로 **3가지 중요한 일을 수행**하게 된다.

1. **올바른 모듈 형식으로 변환:** `ts` 코드를 `js`로 변환할 때, **출력 코드가 유효한 모듈 형식**이어야 함. (`import` → `require()`로 바꿔야 하는지 등)
2. **import가 정상적으로 되는지 확인:** `import hello from "greeting-module";`가 **정상적으로 작동하는지** 체크. (만약 `hello`가 존재하지 않으면 **컴파일 오류 발생!** 🚨)
3. **import한 값의 타입을 할당**
   - `hello`가 함수인지? 객체인지?
   - 함수라면 **매개변수 타입과 반환 타입**은 무엇인지?
   - 이걸 알면 **타입 오류를 미리 잡을 수 있음**.

### **호스트(Host)가 누구?**

앞서 언급되는 호스트가 무엇일까? 호스트는 "모듈 로딩 동작을 지시하기 위해 궁극적으로 출력 코드를 소비하는 시스템", 다시 말해서 타입 스크립트의 모듈 분석이 모델링하려고 하는 것은 타입스크립트의 **외부 시스템**이다.

쉽게 말해 호스트는 변환된 코드 또는 타입 스크립트 파일을 **직접 실행하거나 관리하는 환경**이다.

✅ **1) Node.js에서 실행되는 경우** → Node.js가 호스트

- `tsc`로 변환된 JS 파일이 Node.js에서 실행되면 **Node.js가 호스트**.
- `ts-node`처럼 TS 파일을 직접 실행해도 마찬가지로 **Node.js가 호스트**.

✅ **2) 번들러(Webpack, esbuild 등)가 개입한 경우** → 번들러가 호스트

- 번들러는 여러 파일을 분석하고 하나의 큰 파일(번들)을 만듬.
- 이 과정에서 원래의 import/export 구조가 변형될 수 있다.
- 즉, **번들러는 타입스크립트 코드를 가공하는 역할을 하므로 호스트**.
- 하지만 번들된 파일을 실행하는 것은 브라우저 또는 Node.js이므로, **실행 시점의 호스트는 따로 있을 수 있다**.

✅ **3) 단순한 변환 작업만 수행하는 경우** → 호스트가 아님

- 포맷터(Prettier)나 코드 최적화 도구가 TS의 출력 코드(JS)를 가공하지만 import/export 구조를 그대로 둔다면, 이 도구들은 **호스트가 아님**.

✅ **4) 브라우저에서 모듈을 로드하는 경우** → 웹 서버 & 브라우저가 호스트

- 브라우저에서 모듈을 실행할 때는 **웹 서버가 파일을 전송**하고, **브라우저가 모듈 시스템을 실행**한다.
- 즉, 타입스크립트가 직접 개입하는 게 아니라 웹 서버와 브라우저가 호스트 역할을 함.

✅ **5) 타입스크립트 컴파일러(tsc) 자체는?** → 호스트가 아님

- 타입스크립트 컴파일러(`tsc`)는 단순히 변환만 해주는 도구일 뿐, 실행 환경을 제공하지 않음.
- 즉, **tsc는 호스트가 아님**.

### **모듈의 결과와 형태**

프로젝트에서 가장 먼저 해야할 질문은 "호스트가 어떤 모듈을 기대하는가?"이다. 즉 어던 모듈 시스템을 사용할지인데, 그 이유는 각 `실행 환경(호스트)`가 지원하는 모듈 방식이 다르기 때문이다. 예를 들면 아래와 같다.

- **브라우저** → `ES Modules(ESM)`만 지원
- **Node.js v11 이하** → `CommonJS(CJS)`만 지원
- **Node.js v12 이상** → `CJS + ESM 둘 다 지원` (하지만 파일 확장자나 `package.json`에 따라 구분)

그 중 타입 스크립트의 `module` 옵션은 컴파일된 자바스크립트 파일의 모듈 형식을 결정한다. 단순히 `ESM vs CJS`만 정하는 게 아니라, 다음과 같은 기능도 포함한다.

- 어떤 기준으로 파일을 **ESM/CJS**로 감지할지
- 서로 다른 모듈 방식(`ESM ↔ CJS`)을 **호환 가능하게 할지**
- **`import.meta`와 `최상위 await`** 같은 기능을 지원할지

즉, **`module` 설정을 정확하게 해야, 타입스크립트가 import된 모듈을 제대로 이해하고 IntelliSense(자동완성)도 정확하게 제공**할 수 있게 된다.

참고) 심지어 noEmit: true (출력 파일을 생성하지 않는 경우)여도, module 설정이 중요하다. → 컴파일러는 올바른 타입 검사를 위해 모듈 시스템을 이해해야 하기 때문.

이제 타입스크립트에서 사용할 수 있는 `module` 설정을 살펴보자.

**🔍 최신 Node.js 관련 설정**

| 옵션       | 설명                                         |
| ---------- | -------------------------------------------- |
| `node16`   | Node.js 16+의 모듈 시스템 (`ESM + CJS` 지원) |
| `nodenext` | Node.js 최신 버전(향후 변경 반영)            |

- Node.js에서 실행하는 프로젝트라면 node16 또는 nodenext를 선택해야 한다.
- esnext 또는 commonjs를 쓰면 Node.js의 모듈 감지 규칙과 충돌할 수 있다.

**🔍 ECMAScript(ES) 표준에 따른 설정**

| 옵션     | 설명                                                     |
| -------- | -------------------------------------------------------- |
| `es2015` | ES2015(ES6) 표준. `import/export` 문법 지원              |
| `es2020` | `import.meta` 및 `export * as ns` 지원 추가              |
| `es2022` | `es2020` + `최상위 await` 지원                           |
| `esnext` | 최신 ECMAScript 모듈 기능 반영 (앞으로 바뀔 가능성 있음) |

- 최신 JS 표준을 따르는 프로젝트라면 esnext 또는 es2022 추천
- 브라우저 환경에서는 **es2015 이상을 사용** (ES6부터 모듈 지원)

**🔍 기존(전통적인) 모듈 시스템**

| 옵션       | 설명                                                       |
| ---------- | ---------------------------------------------------------- |
| `commonjs` | Node.js의 기본 모듈 시스템 (`require()`, `module.exports`) |
| `system`   | SystemJS 모듈 로더 사용 (거의 안 씀)                       |
| `amd`      | RequireJS 방식 (거의 안 씀)                                |
| `umd`      | CommonJS + AMD 혼합 방식 (거의 안 씀)                      |

- commonjs는 Node.js에서만 사용 가능
- 브라우저 환경에서는 commonjs 대신 es2015 또는 esnext 추천
- amd, system, umd는 최신 프로젝트에서는 거의 사용하지 않음

그러면 "Node.js에서 실행할 프로젝트라면 `esnext`를 써도 될까?"

대답은 "아니오"다.

`esnext`와 `nodenext`는 트랜스파일된 JS 코드가 거의 동일할 수 있지만, **타입 검사 방식(type checking)이 다르기 때문**, 따라서 Node.js에서 실행할 프로젝트는 `node16` 또는 `nodenext`를 사용해야 한다.

**✅ 정리: 어떤 환경에서 어떤 `module` 옵션을 써야 할까?**

| 실행 환경                | 추천 `module` 옵션       |
| ------------------------ | ------------------------ |
| 최신 Node.js(16+)        | `node16` 또는 `nodenext` |
| 브라우저 환경            | `esnext` 또는 `es2022`   |
| 구버전 Node.js(v11 이하) | `commonjs`               |
| ES6+ 표준 JS             | `es2015` 이상            |

각 프로젝트의 실행 환경에 맞게 module 설정을 **정확하게 선택하는 것이 중요하다.**

### **모듈의 형식 감지 방법**

**✅ 1) Node.js에서 파일의 모듈 형식을 결정하는 방법**

Node.js는 `ESM(ES Modules)`과 `CJS(CommonJS)` 두 가지 모듈 형식을 지원한다. 그런데 **각 파일이 어떤 모듈 형식인지**는 단순히 `import`나 `require()`를 사용한다고 결정되지 않는데 Node.js는 **파일 확장자, `package.json` 설정, 디렉터리 구조**를 보고 판단하게 된다.

**🔍 확장자로 모듈 형식 결정**

- `.mjs` → **ESM으로 해석**
- `.cjs` → **CJS로 해석**
- `.js` → **상황에 따라 다름** (아래 규칙 참고)

**🔍 `package.json`의 `type` 필드로 결정**

`.js` 파일은 **가까운 `package.json` 파일**의 `"type"` 값을 따라감.

| `package.json` 위치 | `"type"` 설정 | `.js` 파일의 모듈 형식 |
| ------------------- | ------------- | ---------------------- |
| 없음 (기본값)       | 없음          | **CJS**                |
| 최상위 디렉터리     | `"module"`    | **ESM**                |
| 최상위 디렉터리     | `"commonjs"`  | **CJS**                |

- 가장 가까운 package.json을 찾아서 모듈 형식을 결정
- package.json이 없으면 기본적으로 CJS로 해석.

**🔍 모듈 형식에 따른 실행 방식**

- **ESM 파일**에서는 `require()`를 사용할 수 없음
- **CJS 파일**에서는 `import/export` 문법을 사용할 수 없음

이런 방식으로 Node.js는 파일마다 **정확한 모듈 형식**을 정하고, 실행할 때 에러를 방지한다.

**✅ 2) 타입 스크립트에서 모듈 형식을 감지하는 방법**

타입 스크립트도 Node.js의 모듈 감지 방식을 그대로 따름. 즉, 타입 스크립트는 `--module node16` 또는 `--module nodenext` 옵션이 설정되면, Node.js의 모듈 감지 방식을 그대로 적용하게 된다.

| **입력 파일**                  | **출력 파일** | **모듈 형식** | **이유**                                     |
| ------------------------------ | ------------- | ------------- | -------------------------------------------- |
| `/main.mts`                    | `/main.mjs`   | **ESM**       | `.mts` 확장자는 ESM                          |
| `/utils.cts`                   | `/utils.cjs`  | **CJS**       | `.cts` 확장자는 CJS                          |
| `/example.ts`                  | `/example.js` | **CJS**       | `package.json`에 `"type": "module"`이 없어서 |
| `/node_modules/pkg/index.d.ts` | -             | **ESM**       | `package.json`에 `"type": "module"` 있음     |

- .mts → .mjs로 변환되며 **ESM 유지**
- .cts→.cjs로 변환되며\***\*CJS 유지\*\***
- .ts→.js로 변환될 때는 **\*\***package.json에 따라 결정**\*\***

이렇게 타입 스크립트는 Node.js의 모듈 감지 방식을 따르면서도 타입 검사를 정확하게 수행할 수 있다.

**✅ 3) 타입 스크립트에서 모듈 변환 방식**

타입 스크립트 파일의 `import/export`는 `module` 옵션에 따라 변환 방식이 달라진다.

**🔍 TS to ESM**

```ts
// sayHello.ts
export function sayHello(name: string) {
  console.log(`Hello, ${name}!`)
}
```

```ts
// module: "esnext" 설정시 변환
// sayHello.js (ESM)
export function sayHello(name) {
  console.log(`Hello, ${name}!`)
}
```

**🔍 TS to CJS**

```ts
// sayHello.ts
export function sayHello(name: string) {
  console.log(`Hello, ${name}!`)
}
```

```ts
// module: "commonjs" 설정시 변환
// sayHello.js (CJS)
"use strict"
Object.defineProperty(exports, "\_\_esModule", { value: true })
exports.sayHello = void 0
function sayHello(name) {
  console.log(`Hello, ${name}!`)
}
exports.sayHello = sayHello
```

**🔍 `verbatimModuleSyntax` 옵션의 등장 (TypeScript 5.0)**

typeScript 5.0에서는 **새로운 옵션 `verbatimModuleSyntax`가 추가** . 이 옵션을 사용하면, **import/export가 변환 없이 그대로 유지됨**.

```ts
// 기존 방식
import { sayHello } from "greetings"
sayHello("world")

// 기존 module: "commonjs" 설정 후 변환
;("use strict")
const greetings_1 = require("greetings")
;(0, greetings_1.sayHello)("world")
```

```ts
import { sayHello } from "greetings"
sayHello("world")

// verbatimModuleSyntax: true 설정 시
// 변환 없이 그대로 유지 가능
import { sayHello } from "greetings"
sayHello("world")
```

### 마무리

이번 글은 **타입스크립트의 모듈 해석 방식(Module Resolution)과 트랜스파일링 과정**에 대해 다뤘다. 그중, **Node.js 및 번들러(Webpack) 환경에서의 모듈 처리 방식 차이**, 그리고 **모듈 설정 값(module 옵션) 선택에 따른 실행 환경 차이**를 상세히 분석해보았다.

이를 통해 타입스크립트 프로젝트를 구성할 때,적절한 모듈 설정을 선택하고 변환 과정에서 발생할 수 있는 문제를 방지하는 방법을 이해할 수 있었다. 다음으로는 `Module Resolution`에 대한 상세한 내용을 다뤄보자.

#### 참고

- [Modules - Theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
