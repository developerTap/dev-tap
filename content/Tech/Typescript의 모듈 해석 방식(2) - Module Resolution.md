지난 [타입 스크립트 모듈 해석 방식 - tsconfig 설정과 실행 환경에 따른 차이](<./Typescript%20모듈%20해석%20방식(1)%20-%20tsconfig%20설정과%20실행%20환경에%20따른%20차이.md>) 포스팅 다음 글로, Typescript의 중요한 옵션 중 하나인 `Moduel Resolution`에 대해서 알아보려고한다. 먼저 Module Resolution이 무엇인지, 이를 해석하는 방식이 어떻게 되고, 다양한 모듈에 대한 대응 방식 등에 대해 정리해보았다.

## Module Resolution이란 무엇일까?

Typescript는 `import`한 파일을 실제로 어디서 찾는지 결정하는 과정이 어떻게 될까?

```ts
import sayHello from "greetings"
sayHello("world")
```

`greetings`는 어디에 있을까?

- `node_modules/greetings/index.js`일까?
- `./greetings.ts`일까?
- `./src/greetings.ts`일까?

이걸 찾는 규칙이 바로 `Module Resolution`이다.

## 모듈 해석 방식은 `호스트`가 정한다.

Javascript 표준(ECMAScript)에서는 Ipmort/export 문법을 정의하지만, 이 모듈이 어디에 있는지 찾는 담당자는 실행 환경(호스트)다.

예를 들어 Javascript의 새로운 런타임을 만든다고 가정해보자.

```js
import monkey from "🐒" // -> './eats/bananas.js'
import cow from "🐄" // -> './eats/grass.js'
import lion from "🦁" // -> './eats/you.js'
```

이런식으로 정의해도 Javascript 표준에는 문제가 없다. 하지만 Typescript는 `런타임 모듈을 어떻게 찾는지 알아야만 타입을 정확히 체크`할 수 있다. 그래서 제공되는 옵션이 `moduelResolution`이다.

Typescript는 여러 환경에서 동작할 수 있도록 다양한 `moduelResolution`옵션을 제공한다.

| **옵션**     | **설명**                                                   | **추천 여부**                                  |
| ------------ | ---------------------------------------------------------- | ---------------------------------------------- |
| **classic**  | TypeScript의 **옛날 모듈 해석 방식** (RequireJS 지원)      | ❌ **(Deprecated 예정, 사용 X)**               |
| **node10**   | Node.js v10 이하의 모듈 해석 방식                          | ❌ **(Node.js v12 이상에서는 문제 발생 가능)** |
| **node16**   | Node.js v12+의 모듈 해석 방식 (CJS & ESM 지원)             | ✅ **(Node.js 프로젝트 추천)**                 |
| **nodenext** | 최신 Node.js 모듈 해석 방식 (Node.js 발전에 맞춰 업데이트) | ✅ **(최신 Node.js 프로젝트 추천)**            |
| **bundler**  | Webpack, esbuild 같은 번들러 환경에 맞춘 모듈 해석 방식    | ✅ **(번들러 프로젝트 추천)**                  |

> 위 모듈 해석 방식에 대해서는 이전 포스팅인 [타입 스크립트 모듈 해석 방식 - tsconfig 설정과 실행 환경에 따른 차이 > 모듈의 형식을 감지 방법](https://ironist-tapkim.tistory.com/24#%EB%AA%A8%EB%93%88%EC%9D%98%20%ED%98%95%EC%8B%9D%20%EA%B0%90%EC%A7%80%20%EB%B0%A9%EB%B2%95-1-4)에서 잠깐 보고오면 좋다.

## Typescript의 모듈 해석 방식

지금까지의 설명을 한줄로 말하자면, TypeScript에서 **모듈 해석(module resolution)** 은 단순히 import를 찾는 것이 아니라 **출력 파일(output files)에서 실제로 어떻게 동작할지 확인하는 과정**이다.

### 모듈 해석 과정의 가설

```ts
// @Filename: main.ts
import { add } from "./math"
add(1, 2)
```

위 코드를 보면 `./math`이라는 문자열이 `모듈 지정자(module specifier)`인데, Typescript는 이 모듈이 어떤 파일을 가리키는지 해석해야한다.

그런데 코드 상으로만 보았을때는, `./math`가 `math.ts`를 의미한다고 생각할 수 있으나, Typescript에서는 단순히 **`math.ts`를 찾는 것이 아니라 출력 결과(main.js, math.js)에서도 해당 import가 실제로 동작하는지 확인**해야한다.

단순히 모듈을 해석하는 과정은 아래와 같은 이미지 처럼 생각할 수 있다.

![](https://www.typescriptlang.org/c858b89407a2057ead56516c9a77c783/theory.md-1.svg)
![](https://www.typescriptlang.org/b1f11e84a45a07707dbe1bb284b2fbff/theory.md-2.svg)

하지만 실제 런타임을 고려해서 모듈을 해석한다면 위와 같은 실제 동작 방식이 되는지 확인해봐야한다. 아래 동작 순서를 보자.

- `main.ts` → 컴파일 후→ `main.js`
- `math.ts` → 컴파일 후 → `math.js`
- `main.js`에서 `import "./math.js"` 실행

이 과정이 실제로 `tsc` 후 `.js`에서도 import가 제대로 동작하는지 확인해봐야하는데, 이를 `moduleResolution`옵션을 통해 출력 파일에서 올바른 모듈 해석이 이루어지도록 설정해야한다.

### ESM의 엄격한 파일 확장자 요구 사항

ESM(ES Modules)에서는 파일 확장자를 명확히 기재해야한다.

```ts
// @moduleResolution: node16
// @rootDir: src
// @outDir: dist
// @Filename: src/math.mts
export function add(a: number, b: number) {
  return a + b
}

// @Filename: src/main.mts
import { add } from "./math.mjs" // 확장자 필수
add(1, 2)
```

하지만 `math.mjs`는 실제로 존재하지 않는다. 왜냐하면 실제로는 `math.mts`이 존재하고, **컴파일 후** `math.mjs`가 생성되기 때문이다.

![](https://www.typescriptlang.org/729e81e79e38af5bf41ddf97aba453d1/theory.md-3.svg)

- `src/main.mts` → `dist/main.mjs`
- `src/math.mts` → `dist/math.mjs`
- `dist/main.mjs`에서 `import "./math.mjs"` 동작

ESM에선 컴파일 후 (output directory: `dist`)에서도 `import "./math.mjs"`가 올바르게 동작되어야 하므로, Typescript는 확장자를 **미리 명확하게 지정**하도록 요구한다.

즉, Typescript는 `출력 파일을 기준으로 모듈을 해석`하고 타입을 할당하는 방식으로 동작한다는 것을 알 수 있다.

### 선언 파일(.d.ts)의 역할

Typescript는 타입 검사를 위해 **선언 파일(.d.ts)** 를 활용해 이파일을 직접 생성할 수도 있고, 라이브러리를 제공하는 개발자가 제공할 수 있다.

선언 파일이 실제 컴파일 과정에서 어떻게 구성되는지 관계도를 확인해 보자.
![](https://www.typescriptlang.org/fef70ad85e4ea4ef928cc62ddb67407b/declaration-files.svg)

- `math.ts` → `math.js`와 `math.d.ts` 생성
- `math.d.ts`는 `math.js` 타입 정보 제공
- TypeScript는 `.d.ts` 파일이 존재하면 `.js` 파일을 직접 분석하지 않고, 타입 정보만 읽음

```ts
// math.d.ts
declare function add(a: number, b: number): number
export { add }
```

실제 선언 파일을 보면 접두사 `delcare` 를 통해 선언 타입을 제공하는 함수임을 확인할 수 있다. 즉, `.d.ts` 파일 덕분에 Typescript는 `.js`파일을 직접 실행하지 않고도, `.d.ts` 파일을 보고 추론하고자하는 타입을 알 수 있는 것이다.

선언 파일을 생성하고싶다면 아래 명령어만 입력하면 `.ts` 파일에서 `.d.ts`파일을 자동 생성이 된다.

```sh
tsc --declaration
```

평소 npm 라이브러리를 확인해 볼때 `DT`라고 표기 되어있는 라이브러리는 `declare type`파일이 필요하다고 마크가 표기되어 있는 것을 알 수 있다. `TS`가 표기 되어 있다면, 라이브러리 내부에 선언 파일을 제공함을 나타내는 마크를 확인할 수 있을 건데 이제 왜 따로 제공되어야하는지 이해할 수 있을 것이다.

## 라이브러리의 Module Resolution 선택의 중요도

라이브러리를 제공하는 입장에서 Typescript를 지원한다면 Module Resolution 선택이 중요하게 된다.

- 애플리케이션을 컴파일할 때는 **모듈 해석 방식이 고정**된다.(예: node16, bundler)
- 라이브러리 제작시
  - 라이브러리가 어디서 실행되는지 모름
  - 가능한 여러 환경에서 동작 가능하도록 설정해야함

당연히 라이브러리는 `최대한의 호환성`을 고려해서 제작되어야하고, 이를 `moduleResolution` 옵션으로 제공할 수 있다.

### 1. 라이브러리 제공시: moduleResolution: "node16" 추천

왜 라이브러리 제공시 `node16`을 추천하는 걸까?

```json
{
  "compilerOptions": {
    "module": "node18",
    "moduleResolution": "node16"
  }
}
```

- module: "node18"을 선택하면 `moduleResolution: "node16`이 자동 적용
- Node.js의 엄격한 모듈 해석 규칙을 따르기 때문에, 다양한 환경에서 동작 가능
- 번들러(Webpack, Rollup, esbuild 등)에도 대부분 호환 가능

### 2. moduleResolution: "bundler" 사용 시 문제점

만약 라이브러리가 `moduleResolution: "bundler"`로 컴파일 되어있다면? 번들러에는 문제없이 동작하지만, **Node.js**에서는 오류가 발생할 수 있다.

```ts
// index.ts
export * from "./utils"
```

`utils.ts` 또는 `utils/index.ts`가 존재하면 번들러는 이 코드를 문제 없이 처리할 수 있다. 하지만 Node.js에서는 `.utils.js`가 필요하기 때문에 런타임시 오류가 발생한다.

```sh
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../node_modules/dependency/utils'
Did you mean to import ./utils.js?
```

따라서 `moduleResolution: "bundler"`옵션 설정시 Node.js는 `.ts` 파일을 실행할 수 없고, `utils.js`를 찾으려하기 때문에 문제가 발생하게 된다.

이를 해결하기 위해서는 `moduleResolution: "node16"`을 사용하고 확장자를 명시해야한다.

```ts
// index.ts
export * from "./utils.js" // 확장자 명시
```

즉, moduleResolution: "bundler"는 번들러에서만 동작 가능하므로 라이브러리에는 적절하지 않다. 따라서 라이브러리는 moduleResolution: "node16"을 사용하고, 확장자를 명시하는 것이 더 안전하다.

물론 일반 서비스 프로젝트라면 상황에 따라 bundler 옵션을 사용해도 크게 무방하다.

### 3. moduleResolution: "nodenext"은 괜찮을까?

`moduleResolution: "nodenext"`는 **Node.js에서 동작하는지 체크**하는 옵션이다. 대부분의 번들러에서도 동작할 가능성이 높긴하나 번들러까지 100% 보장하지는 않는다.

반면, Node.js에서 동작하는 모듈 코드는 대부분 번들러에서도 동작이 가능하다. 따라서 라이브러리에서는 `moduleResolution: "node16"`을 선택하는 것이 더 안전하다.

### 4. 번들링을 한다면?

만약 라이브러리를 번들링해서 배포한다면? `moduleResolution: "bundler"`도 가능하다.

```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}
```

번들러가 최종적으로 모듈 형식을 변경하고, `utils.js` 문제를 해결한다. 하지만 이 경우에는 `tsc`가 모듈 환성을 직접 보장할 수 없다.

왜냐하면 `tsc`는 타입 검사를 수행하고 Typescript 코드를 Javascript로 변호나하는 역할을 한다. 하지만 번들링이 개입된다면 Typesript가 **컴파일 후의 코드 구조를 예측할 수 없는 경우**가 발생하게 된다.

## 번들링 후 모듈 해석이 달라지는 이유

TypeScript에서 `moduleResolution: "bundler"`을 사용할 때, 다음과 같은 코드가 있다고 가정해보자.

```ts
// utils.ts
export function add(a: number, b: number) {
  return a + b
}

// index.ts
export * from "./utils"
```

위 코드를 `tsc`가 컴파일하면

```ts
// utils.js
export function add(a, b) {
  return a + b
}

// index.js
export * from "./utils"
```

그런데 번들러가 번들링하면 다음과 같이 바뀔 수 있다.

```ts
// bundle.js (모든 모듈이 하나의 파일로 합쳐짐)
function add(a, b) {
  return a + b
}

export { add }
```

원래 `index.js`가 `utils.js`를 참조해야 했지만, 번들러는 이를 "파일 경로"없이 하나의 파일에 묶어 버린다. 즉, Typescript가 예상했던, `"./utils.js"`모듈이 사라지고, 번들러 내부에서만 동작하는 코드로 바뀌어 버린다. 이 과정을 통해 tsc는 번들링 후의 최종결과를 예측할 수 없게 된다.

그렇다면 언제 `moduleResolution: "bundler"`을 써야 할까?

`moduleResolution: "bundler"`는 번들러가 최종적으로 모듈을 해석하는 경우에만 안전하다. 하지만 **TypeScript의 tsc는 번들러가 실제로 어떤 식으로 코드를 조정할지 알 수 없기 때문에, 번들링 전제라면 모듈 호환성을 직접 보장할 수 없다.** 따라서 번들링을 하는 라이브러리라면 **번들러가 최종적으로 모듈 형식을 조정하도록 설정**해야한다.

## 정리

Javascript의 슈퍼셋이라 불리는 Typescript가 각 모듈별로 어떻게 대응할 수 있는지 그 흐름과 어떻게 동작되는지 알아보았다. Typescript에서는 정말 많은 옵션이 제공되고, 각 옵션에 따라 사용자가 프로젝트에 맞게 기능을 제공 받을 수 있다. 실제로 글에서 알수 있듯이, 일반적인 서비스 프로젝트라면 크게 신경 쓰지 않아도 되는 부분이 많다.

하지만 라이브러리를 제공하는 범용적인 상황일때 제공해야하는 환경을 고려해야한다면 신중하게 설정해야하는 부분이 많다. 또한 여러 서비스와 패키지를 관리해야하는 모노레포 환경과 같이 다양한 모듈을 제어할 수 있는 환경의 아키텍처를 사용한다면, 더욱 신중하게 설정해야함을 알 수 있었고 Typescript 개발자들이 `"호환성"`을 어떻게 해결할 것인지 많은 고민을 한 흔적들이 흥미롭게 보였다.
