---
lastmod: 2023-07-31
tags:
  - yarn
  - yarn-berry
  - node_modules
  - pnp
  - zero-install
---

![[yarn-berry 마이그레이션 적용기1.webp]]

# _**npm? pnpm? yarn? Yarn Berry?**_

## **npm vs yarn**

> NPM(Node Package Manager)는 Javascript를 위한 패키지 매니저. command-line으로 오픈 소스를 설치하고 활용할 수 있는 도구이다. (이전까지는 기능을 직접 추가하거나 Github에서 다운 받아서 넣었다)

> Yarn은 Facebook에서 만든 Javascript 패키지 매니저. npm의 단점을 향상시키기 위해 만들어진 매니저 툴이며, 속도, 안정성, 보안성등이 npm보다는 높다. 실제로 데이터를 캐시에 저장하고 병렬처리하여 npm보다 성능과 속도가 더 빠르다는 것을 알 수 있다.

하지만 18년도 쯤 부터는 npm과 yarn 성능 차이가 크게 나지 않아. 접근성으로 오히려 npm이 더 역사가 깊고 접근성이 좋아 여전히 가장 많은 사용자를 보유하고 있다.(pnpm의 출현으로 더욱 증가됨)

## **Yarn Berry란?**

Yarn(v1)의 세 번째 버전인 v3이며, Yarn Berry(v3)라고 부름. 기존의 ‘깨져있는’ NPM 패키지 관리 시스템을 개선하기 위해 나왔다.

> yarn classic(v1) → beryy(v2) → yarn berry(v3)

## **NPM의 문제점**

![[yarn-berry 마이그레이션 적용기2.png]]

### **1\. 비효율적인 의존성 검색**

- node_modules의 으로 패키지를 찾기 위해 **계속 상위 디렉토리의 node_modules를 탐색**.  
  따라서 패키지를 늦게 찾을수록, 느린 I/O가 반복되거나 실패하기도 한다.

> cf) TypeScript 는 너무 비효율적인 나머지 처음으로 Import 하기 전까지는 내부 타입 정보를 찾지도 않기도 함 ([TS4.0 Changelog](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0-beta/#smarter-auto-imports))

### **2\. 환경에 따라 다른 동작**

- 상위 디렉토리가 어떤 node_module를 포함하고 있는지에 따라 의존성을 불러들이거나 못 불러들이는 상황을 발생하는 여지가 존재함.(npm 설치 시 간헐적 이슈의 원인)

### **3\. 비효율적인 설치**

- 일반적으로 많은 양의 모듈을 설치하고 I/O 작업이 많은 구조인 node_modules.
- 복잡한 의존성 트리구조 때문에 유효성 검증이 어려움.
- 수많은 I/O 호출로 인해 메모리를 많이 먹게 되고 느려짐.

### **4\. 유령 의존성(Phantom Dependency)**

![[yarn-berry 마이그레이션 적용기3.png]]

중복해서 설치되는 node_modules를 아끼기 위해 Hoisting 기법이 사용됨\*(이로 인해 ~유령 의존성이…)~\*

공간을 아끼기 위해 우측과 같이 바꿔주는 작업을 진행함.

이로 인해 package-1에서 사용할 수 없었던 B\[1.0)\]을 사용할 수 있게 되며 이런 현상을 **유령 의존성**이라고함.

이때 설치하지도 않은 라이브러리를 사용할 수도 있고, 그로 인해 사용하고 있던 라이브러리가 없어지는 경우가 현상이 생겨 의존성관리가 혼란스러워짐

## **Plug’n’Play(PnP)**

Yarn Berry는 PnP를 도입하여, 위 문제들을 해결함.

#### **[인터페이스 링커(Interface Linker)](https://yarnpkg.com/api/interfaces/yarnpkg_core.linker.html)**

> Linker는 논리적 종속성 트리와 파일 시스템에 표시되는 방식 사이의 접착제입니다.  주요 용도는 패키지 데이터를 가져와 대상 환경이 이해할 수 있는 방식으로 파일 시스템에 저장하는 것입니다 (예: Node의 경우.pnp.cjs 파일 생성). 여러 링커가 동일한 종속성 트리에 공존할 수 있습니다. 이렇게 하면 다른 링커의 패키지를 포함하는 고유한 종속성 트리를 가질 수 있습니다.

- node_modules 제거

- .yarn을 사용하여 하위에 의존성을. zip 포맷으로 압축 저장
- .pnp.cjs 파일 생성(의존성 트리 정보를 단일 파일에 저장)

**.pnp.cjs는** 의존성 트리에서 **중첩된 맵**으로 표현.

> 기존 Node가 파일 시스템에 접근하여 직접 I/O를 실행하던 require 문의 비효율적인 자료구조를 메모리에 올리는 방식으로 탐색 최적화 +  의존성 압축을 통해 용량 절감

```js
// .pnp.cjs
["@babel/helper-module-transforms", [\
        ["npm:7.22.9", {\
          "packageLocation": "./.yarn/cache/@babel-helper-module-transforms-npm-7.22.9-dfa9ef05d1-2751f77660.zip/node_modules/@babel/helper-module-transforms/",\
          "packageDependencies": [\
            ["@babel/helper-module-transforms", "npm:7.22.9"]\
          ],\
          "linkType": "SOFT"\
        }],\
        ["virtual:509b29c82e8a1a01d4a12c9b7b502644021e94d233fa6e64533c75d14d6b00effd5817505571c7d810fb20d5a5a3d43daecdfa19af8bd6ea86ef59fc4107ecfd#npm:7.22.9", {\
          "packageLocation": "./.yarn/__virtual__/@babel-helper-module-transforms-virtual-03105e0436/0/cache/@babel-helper-module-transforms-npm-7.22.9-dfa9ef05d1-2751f77660.zip/node_modules/@babel/helper-module-transforms/",\
          "packageDependencies": [\
            ["@babel/helper-module-transforms", "virtual:509b29c82e8a1a01d4a12c9b7b502644021e94d233fa6e64533c75d14d6b00effd5817505571c7d810fb20d5a5a3d43daecdfa19af8bd6ea86ef59fc4107ecfd#npm:7.22.9"],\
            ["@babel/core", "npm:7.22.9"],\
            ["@babel/helper-environment-visitor", "npm:7.22.5"],\
            ["@babel/helper-module-imports", "npm:7.22.5"],\
            ["@babel/helper-simple-access", "npm:7.22.5"],\
            ["@babel/helper-split-export-declaration", "npm:7.22.6"],\
            ["@babel/helper-validator-identifier", "npm:7.22.5"],\
            ["@types/babel__core", null]\
          ],\
          "packagePeers": [\
            "@babel/core",\
            "@types/babel__core"\
          ],\
          "linkType": "HARD"\
        }]\
      ]],\
```

**linkType를 통해 해당 패키지 설치시 필요한 의존성을 즉시 찾을 수 있다.**

- HARD: 패키지 관리자가 위치(일반적으로 캐시 내의 항목)를 소유하고 마음대로 변환할 수 있다. (Ex) PnP 링커가 해당 패키지를 분리하기로 결정할 수 있음
- SOFT: 패키지 관리자는 위치(Symbolic Link, 작업 공간 등)를 소유하지 않으므로 링커는 있는 그대로 사용하는 것 외에는 아무것도 할 수 없습니다.

#### **.yarn/cache에 다운된 종속성들**

![[yarn-berry 마이그레이션 적용기3.png]]

노드 링커 설정을 node_moduels 또는 pnp로 자유롭게 변경 가능

# **Zero Install**

- .yarn 폴더에 받은 파일을 오프라인 캐시가 가능한 기능. git에 **.yarn**을 포함시켜 **누구나 같은 실행 환경을 보장해 주면 별도의 설치과정이 필요가 없다.**
- zero install의 가장 큰 장점으로 브랜치 체크아웃할 때마다 의존성 커밋도 공유하며 사용할 수 있기 때문에 node_modules가 동일한지 체크하는 단계가 사라진다. **즉, 매번 npm install과 캐시 처리 작업이 필요 없어지게 된다.**
- 추가로 **CI에서 의존성 설치하는 시간을 절약**하게 된다

---

# **yarn-berry를 적용한 이유💡**

1. 이번 알툴즈 리뉴얼 프로젝트에서 **beta** 버전과 **v1.0.0** 버전을 **동시에 작업해야 하는** 환경에서 서로 다른 의존성 관계로 인해 브랜치 체크아웃마다 매번 node_modules를 갈아 끼워줘야 했다.
2. 너무 느린 패키지 설치과정과 컴파일 과정으로 인해 tsserver의 속도 및 다양한 환경에서 DX가 좋지 않았다.
3. gitlab의 구버전 이슈 + storybook + cypress + 기타 라이브러리들의 개수가 많아 CI/CD 속도가 너무 느림.
4. node_modules의 근본적인 구조적 문제를 계속해서 안고 갈 수 없었기에 진행함.
5. 추후 모노레포로 넘어가기 위한 첫 발판 구축

> ~오픈 전에 개선을 해야 나중이 고통스러운 과정을 헤쳐나갈 수 있다는 것을 직감했기에 오픈 2주 전 적용하기로 결심~

## **개선된 사항**

1. 눈에 띄게 단축된 빌드 속도(시간대 비교를 해보진 못함)
2. pnp Linker 적용 후 용량 최적화 (951M → **161M**)

![[yarn-berry 마이그레이션 적용기4.png]]

1. zero-install로 인해 **DX 개선에 큰 효과**
2. **컴파일 속도**와 낙수효과로 **tsserver/eslint server 속도 향상**
3. CI/CD 과정에 있어 **시간 축소와 Docker 용량 최적화**
   - github CI/CD 적용을 위해 A+ 프로젝트를 사전에 먼저 반영.
   - 전체 진행시간 5분 내외로 감축
   - 프로젝트 용량
   - 700M → 1. G → **300MB로 감소**
4. Repository 설치 시 종속성 크기 감소
5. Local과 Remote 환경의 빌드 결과물 동일성 보장
6. 엄격한 종속성 트리 관리로 인해 안정성 향상

# **Trouble Shooting**

- **커밋에 포함되지 않는 종속성 문제**
  - **. yarn/install-state.gz은** 최적화 파일이기 때문에 애초에 커밋할 필요는 없지만 Next.js의 swc 모듈은 OS에 종속되는 부분이라 커밋에 포함시켜야 하는 예외 케이스 발생   
    *\> 이에 따른 실행 환경에 따라 문제가 생길 수 있어 정상적인 빌드를 위해 최초 1회 설치 명령어 필요  
    *그렇지 않으면 아래와 같은 오류 발생

![[yarn-berry 마이그레이션 적용기5.png]]

- **.yarn** 이라는 비교적 큰 용량을 차지하는 패키지를 git에 올리기에 git push 용량 초과 이슈로 인해 수동으로 용량 초과 기능을 꺼야하는 상황이 발생(최초 Push시에만)

- **의존성 추가 설치**  
  기존 유령 의존성으로 사용되었던 라이브러리들이 개별 Map으로 관리되면서 의존성 강화를 위해 별도로 추가 설치해야하는 과정 발생  
  Ex) **react-syntax-highligher, prop-types , tslib** 등

![[yarn-berry 마이그레이션 적용기6.png]]

- Gitlab 구버전 이슈  
  yarn berry 패키지 모듈에 필요한 스크립트 수정과 동시에 DockerFile 스크립트 개선을 진행했으나, Gitlab 캐싱 이슈 + Multi From builder 이슈 등으로 인해 이전 CI script 방식에서 yarn 부분만 변경해서 진행

- Storybook v7 이슈  
  기존 Storybook v6.5 버전 사용 시 사이드 이펙트가 발생하여 v7버전으로 추가 마이그레이션 작업 진행하였고, 추가/삭제/변경되었던 메서드나 로직을 변경하는 과정이 생김

# **Reference**

1.  [리멤버 웹 서비스 좌충우돌 Yarn Berry 도입기](https://blog.dramancompany.com/2023/02/%EB%A6%AC%EB%A9%A4%EB%B2%84-%EC%9B%B9-%EC%84%9C%EB%B9%84%EC%8A%A4-%EC%A2%8C%EC%B6%A9%EC%9A%B0%EB%8F%8C-yarn-berry-%EB%8F%84%EC%9E%85%EA%B8%B0/?fbclid=IwAR3DBwdX1eOnGayDvonscUxD6nQl1mLBi6X8MaZOmNrL_IfPIR_GHhdFKFM)
2.  [Toss yarn-berry 도입기](https://toss.tech/article/node-modules-and-yarn-berry)
3.  [프로젝트 yarn-berry로 마이그레이션 하기](https://velog.io/@sangbooom/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-yarn-berry%EB%A1%9C-%EB%A7%88%EC%9D%B4%EA%B7%B8%EB%A0%88%EC%9D%B4%EC%85%98-%ED%95%98%EA%B8%B0)

## **참고 사항**

- **[Yarn 대신 pnpm으로 넘어간 3가지 이유](https://hiddenest.dev/yarn-pnpm-3)**
