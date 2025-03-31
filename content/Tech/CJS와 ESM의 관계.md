---
lastmod: 2023-09-27
---

> 참고) 본 글은 feconf2022의 박서진 님의 발표 영상을 참고하여 정리한 글입니다.

## **import? require?**

개발하다보면 많이 보이는 에러 메시지들…

![[CJS와 ESM의 관계1.png]]

![[CJS와 ESM의 관계2.png]]

> 우리가 사용하는 import문은 왜 이상할까? 어떻게 하면 올바른 import문을 사용할 수 있을까?

## **CJS(CommonJS)**

```html
<!-- 전역 jQuery 사용 -->
<script src="https://cdn.com/jquery.js"></script>
<!-- 전역 lodash 사용 -->
<script src="https://cdn.com/lodash.js"></script>
<!-- 전역 객체를 참조하여 사용 -->
<script>
  jQuery(document).ready(function () {
    lodash.get(obj, "foo")
  })
</script>
```

> ~옛날방식…Embed…~

## **CommonJS의 문제점과 가능해진 점**

1. 전역변수를 무조건 참조로 인한 네이밍 중복
2. 파일을 하나하나 가져오기 때문에 수천 개의 모듈/파일을 관리하기에 용이하지 않음

이를 해결하고자 CommonJS에서 **require**(_CommonJS를 규정할 수 있는 가장 큰 특징의 함수_) 함수 제공.

앞서 복잡한 라이브러리 함수들을 가져오는 방식에서 **require** 호출 한 번으로 처리가 가능해졌다.

CommonJS를 사용함으로써 외부에 있는 라이브러리를 가져오거나 노출하는 것이 쉬워졌다.

예전에는 모듈마다 라이브러리를 가져오는 방식의 표준이 없어서 어려웠으나, 지금은 작은 add라는 함수를 들고 오는 것도 편해졌다.

```js
exports.add = function (a, b) {
	return a + b;
}
const { add } = require('./add.js');
console.log(add(1, 2);
```

## **CommonJS가 생기고 나서 가능해진 점**

1. “파일 단위”의 개발 가능
2. 수백, 수천 개 JS 파일로 분리가 가능
3. 손쉬운 라이브러리 함수 재사용

등등..

> 의문: 그렇다면 우리는 대부분 import/export 문을 사용하는데 왜 Node.js는 CJS를 사용할 수 있는 것인가🤔?

## **가짜 import의 비밀: TSC / Babel**

![[CJS와 ESM의 관계3.png]]

_[babel-playground](https://babeljs.io/repl#?browsers=&build=&builtIns=false&corejs=3.21&spec=false&loose=false&code_lz=JYWwDg9gTgLgBAJQKYEMDG8BmUIjgcilQ3wG4g&debug=false&forceAllTransforms=false&modules=commonjs&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=env%2Creact&prettier=true&targets=&version=7.23.1&externalPlugins=&assumptions=%7B%7D)_

![[CJS와 ESM의 관계4.png]]

_[typscript-playground](https://www.typescriptlang.org/play?module=1&ts=5.2.2#code/JYWwDg9gTgLgBAJQKYEMDG8BmUIjgcilQ3wG4Aoc5dGAOjSJRiQFEAbJEJAOxgAp8AE2AA3fAEpSQA)_

> 우리가 쓰고 있는 import/export 문은 생긴 것만 이렇게 사용하고 있지 사실은 require문을 사용하고 있었다.

## **CommonJS의 문제점**

**1. 언어 표준 ❌**

CommonJS가 지원하는 런타임 환경에서만 사용이 가능하다(Node.js)

**2. 정적 분석이 어려워진다.**

- 조건적으로 호출하거나
- 삼항 연산자를 쓰는 것처럼 동적으로 꺼내 쓰거나
- 다른 require 함수를 사용해 덮어쓰거나

특히 브라우저에선 성능을 위해서 사용하지 않는 코드를 걷어내는 tree-shaking을 사용하는 데 있어서 어려움을 겪을 수 있다.

```js
if (SOME_CONDITION) {
  React = require("react")
}

require(SOME_CONDITION ? "foo" : "bar")

const originalRequire = global.require
originalRequire(SOMETHING)
```

**3. 비동기 모듈 정의 불가능**

```js
let isInitialized = false

exports.initialize = async function initialize() {
  if (isInitialized) {
    throw new Error("이미 initialize가 실행되었습니다.")
  }

  await connectToDB()
  isInitialized = true
}

exports.readFromDB = async function readFromDB() {
  if (!isInitialized) {
    throw new Error("initialize가 실행되지 않았습니다.")
  }
}
```

DB에 읽고 쓰는 동작을 하기 위해 먼저 Connect를 진행해야 하는데, CommonJS에서는 initialize 함수를 통해 먼저 초기화를 한다.

또한 함수를 실행할 때마다, 매번 초기화 됐는지를 검사하는 로직이 필요하여, 필요 이상으로 복잡한 코드가 작성됨.

무엇보다 자바스크립트의 가장 큰 장점이고 특징인 ‘비동기’ 프로그래밍의 궁합도 맞지 않는다.

**4. 조용한 require 함수 재정의**

```js
const defaultRequire = global.require;
const myRequire = require(request) {
    ...

    global.require = myRequire;
}
```

require 함수가 마음대로 몽키패치가 되면서 이상하게 마음대로 동작하는 현상도 발생할 수 있음.

좋은 예로는 Jest 사용 시 목데이터나 로직을 동기적으로 가져오기 위해 require 함수를 조용히 사용 가능하다.

```js
jest.mock("../moduleName", () => {
  return jest.fn(() => 42)
})

// This runs the function specified as second argument to `jest.mock`.
const moduleName = require("../moduleName")
moduleName() // Will return '42';
```

> CommonJS는 처음으로 성공한 자바스크립트 모듈이었지만 이와 같은 문제점으로 인해 더 좋은 모듈 시스템이 필요했다!

---

## **ESM(ECMAScript Modules)**

> ECMAScript Modules(ESM)이라는 표준 모듈 시스템이 나오게 된다!(진짜 import문)

**1. ESM 문법**

```js
export function add(x,y) {
    return x + y;
}
import { add } from ='./index.js';
console.log(add(1, 2)); // 3
```

**2. 쉬운 정적 분석**

자바스크립트 파일이 어떤 파일을 참조하고 있는지 바로 알 수 있게 되었다.

덕분에 브라우저 환경처럼 자바스크립트 파일 크기를 줄이는 게 중요한 환경에서도 쓰기 쉽게 되었다.

또한 **import/export**는 ‘**키워드**’이기 때문에 함부로 재할당 할 수 없다. (if, for, while을 다르게 쓸 수 없듯이)

```js
// 틀린 코드 1
if(SOME_CONDITION) {
    import React from 'react';
}

// 틀린 코드 2
import Something form CONDITION ? 'foo' : 'bar';

// 틀린 코드 3
const myImport = import;
myImport React from 'react';
```

**3. 쉬운 비동기 모듈(feat. Top-level await)**

모듈의 가장 상단에서 await 사용이 가능해졌다. → 비동기 모듈 정의가 가능해졌다.

> 앞서 말한 db에 연결하는 모듈을 생각해 보면, db에 먼저 연결 후 react, write 함수를 설정할 수 있게 되었다.

왜냐하면 ESM은 기본적으로 비동기로 동작하기 때문에 가능한 구조

```js
const db = await connectDB()
export async function readFromDB() {
  await db.read()
}

export async function writeToDB() {
  await db.write()
}
```

**4. ESM은 “언어 표준”**

Node.js(v12+) 뿐만 아니라 브라우저, Deno 등에도 쉽게 사용이 가능해짐.

CommonJS ESM

|     | **require**      | **import/export** |
| --- | ---------------- | ----------------- |
| 1   | 정적 분석 어려움 | 정적 분석 쉬움    |
| 2   | 동기             | 비동기            |
| 3   | 언어 표준 X      | 언어 표준 O       |
| 4   | 트리셰이킹 어렵  | 트리셰이킹 좋음   |

## **CJS/ESM의 흐름**

![[CJS와 ESM의 관계7.png]]

참고: [https://twitter.com/wooorm/status/1555258256582385664](https://twitter.com/wooorm/status/1555258256582385664)

> ESM이 성장세를 보이지만 이렇게 많은 esm 패키지들이 우리를 괴롭히는 에러 메시지들의 원인이 된다.

## **동기 - 비동기**

> 동기 & 비동기의 한 줄 개념
>
> - 동기: 바로 값을 반환해주는 함수
> - 비동기: 바로 값을 반환하지 않고 Promise나 Callback 함수와 같은걸로 값을 돌려주는 함수

비동기 함수 → 동기함수를 호출하는 것은 쉽다.

그러나 동기 함수 → 비동기 함수를 호출하기가 어렵다. (_why? 동기 함수가 비동기가 되어야 비동기 함수를 사용할 수 있기 때문)_

![[CJS와 ESM의 관계8.png]]

**잠깐! 그렇다는 것은🤔?**

**바꿔 말하면 CJS → ESM 사용 어려우나 ESM → CJS 사용 쉽다는 이야기!**

![[CJS와 ESM의 관계9.png]]

### [1] .js 파일은 가장 가까운 pacakage.json 설정을 따른다.

![[CJS와 ESM의 관계10.png]]

> .js 확장자는 가장 가까운 모듈을 따른다.

![[CJS와 ESM의 관계11.png]]

> package.json의 type 지정

### [2] 경우에 따라 일부 파일만 cjs, mjs로 사용이 가능. cjs는 항상 CommonJS .mjs는 항상 ESM

ex) babel.config.js, jest.config.js,.pnp.cjs, .pnp.loader.mjs 등

![[CJS와 ESM의 관계12.png]]

## **ESM으로 옮기기**

ESM으로 옮기기 어려운 두 가지 이슈…!

**1. 우리가 사용 중인 가짜 ESM**

![[CJS와 ESM의 관계13.png]]

**2. Node.js require 동작**

require 함수는 **해당 파일의 확장자를 모두 순회**하여 확장자에 맞는 컴포넌트를 **_"알잘딱깔센"_**하게 찾아 준다.

```ts

const { Component } = require('./MyComponent')
// ./MyComponent
// ./MyComponent.js
// ./MyComponent.node
// ./MyComponent/index.js
...
```

그렇기 때문에 비용이 비싸고, webpack의 번들링 속도가 저하되고, node.js의 성능이 나빠지는 원인…

![[CJS와 ESM의 관계14.png]]
![[CJS와 ESM의 관계15.png]]

**3. TSC/Babel의 트랜스 파일링**

![[CJS와 ESM의 관계16.png]]

> 지금까지 우리가 작성했던 import/export 문이 tsc나 babel에 의해 트랜스파일링 되거나 웹팩이 알아서 찾아주는 동작을 했기 때문에 별로 문제가 없었지만, 앞으로 ESM을 이용하려면 파일 확장자를 정확하게 작성해야 한다.

## **ESM의 문제점**

**1. 성숙하지 않은 생태계**

**ECMAScript Module Support in Node.js (**[TS 4.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html))

```js
// 그 당시 ts 확장자를 명시해주어도 컴파일이 되지 않았다..!
import { add } from "./add.ts"
```

```js
// ./add.ts만 있다고 해도, ./add.js로 import 해야했었다
import { add } from "./add.tjs"
```

> **배경**
> 타입스크립트 디자인에 따르면, TSC로 타입스크립트를 다 지우기만 해도 완벽하게 돌아가는 것을 기대하고 있었는데 확장자를 rewrite 하는 것은 실제 코드의 내용을 바꾸니까 올바른 디자인 결정이 아니라는 판단을 했었다.
>
> 하지만 이렇게 되면 웹팩이나, ts-module과 같이 다른 도구들과 궁합이 맞지 않고, Deno처럼 Typescript를 쓰지만 ESM이 기본적으로 쓰게끔 하는 게 좋았을 것을…
>
> _~관련해서 깃헙 이슈로 5번이 열렸지만 TS에서 디자인적 이슈가 많은 듯하여 진행 중(아마 해결되긴 어려울 듯)~_
>
> 참고) [typescript 이슈](https://github.com/microsoft/typescript/issues/50152)

**2. 라이브러리 지원: subpath import 문제**

```bash
$ node
// CommonJS로 import를 하면 잘되나, ESM으로 하면 불가능
await import('next/app');
❌ Uncaught: Error: Qualified path resolution failed: we looked for the following paths, but none could be accessed.

// ESM에선 정확한 경로를 원하기 때문에 아래과 같이 가능
await import('next/app.js');
✅ [Module: nujll prototype] { ... }
```

> Next.js v12부터 export field 지원하나 22/10부터 Exports field를 사용하지 않고,
> 현재 import(’next/app.js’) 사용도 가능해짐

## **CommonJS에 의존하는 라이브러리들**

대표: **Jest / ts-node / yarn PnP**

공통점: require의 동작을 바꿈

**1. jest.mock() 동작 방법**

```ts
const defaultRequire = global.require
const jestRequire = (request: string) => {
  if (isMocked(request)) {
    return mockedModule(request)
  }
  return defaultRequire(request)
}
global.require = defaultRequire
```

**2. ts-node 변환 과정**

![[CJS와 ESM의 관계17.png]]

**3. Yarn의 PnP**

![[CJS와 ESM의 관계18.png]]

## TypeScript와 CJS-ESM

|     | **Javascript** | **Typescript** |
| --- | -------------- | -------------- |
| 1   | .js, .jsx      | .ts, .tsx      |
| 2   | .cjs           | .cts           |
| 3   | .mjs           | .mts           |

## **How?**

**어떤 서비스를 ESM으로 옮길까?**

1.  TypeScript를 사용하고 있지 않을 때 또는 .js 확장자를 쓰는 것도 괜찮을 때
2.  사용하는 라이브러리가 ESM 환경을 지원할 때 (react, emotion은 지원)
3.  Jest, Yarn PnP, ts-node 등을 사용하지 않을 때

**어떻게 옮길까?**

- 파일 확장자 추가

```ts
// before
import { add } from "./add"
// after
import { add } from "./add.js"
```

- require() 호출 삭제

```ts

// before
const path = require('path');
const url = reuiqre('url);
module.exports = { ... } ;

// after
import path from 'path';
import url from 'url';
export default { ... };

```

- \_\_dirname

```ts

import { dirname } from 'path';
import { fielURLToPath } from 'url';
const \_\_dirname = dirnmae(fileURLToPath(import.meta.rul));

```

- 최후의 수단(require을 남겨야겠다면)

```ts
import { createRequire } from "module"
const require = createRequire(import.meta.url)
```

## **참고 자료**

- [FECONF 2022 \[B4\] 내 import 문이 그렇게 이상했나요?](https://www.youtube.com/watch?v=mee1QbvaO10)
- [CommonJS와 ESM에 모두 대응하는 라이브러리 개발하기: exports field](https://toss.tech/article/commonjs-esm-exports-field)
