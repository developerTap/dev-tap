---
lastmod: 2024-01-06
tags:
  - sharp
  - next.js
  - next/image
  - docker
  - standalone
  - libuv
  - CI/CD
---

![[Sharp & Docker 이슈를 통한 이미지 최적화기(feat.Next.js)1.png]]

## **개요**

기존 홈페이지에서 페이지 로드 시 높은 화소 이미지로 인한 느린 랜딩 속도로 인해 UX 개선이 절실히 필요하였다. 차선책으로 이미지 압축을 통해 약간의 개선을 하였지만, 그래도 높은 용량의 이미지 처리와 떨어진 퀄리티로 인해 디자이너, 개발자의 만족도가 낮은 상태였고, 퀄리티를 개선하는 방향을 찾다 Next.js(v12.2)의 이미지 최적화 서버를 활용 가능하다고 판단하여 적용하게 되었다.

사실 Next.js의 **next/image** 컴포넌트는 이미 사용 중이었으나, 다양한 이유로 인해 운영환경에서 최적화가 된 채로 배포가 되지 않고 있었다. 다른 사람들은 그냥 컴포넌트만 쓰면 알아서 optimize가 된다는데…. 왜 우리만…!?

보안 이슈, yarn-berry에서의 Sharp 이슈와 Low 버전의 CI/CD 환경에서의 Next.js의 이미지 최적화 과정 중 트러블 슈팅기와 성공 과정을 적어보려 한다.

## **Trouble Shooting**

### **이미지 컴포넌트 version 이슈**

Next.js는 자체적으로 이미지 최적화를 위해 **next/image** 컴포넌트를 제공한다. 하지만 **v12.2**에선 강제로 **span** 태그가 감싸져, 불필요한 css 제어가 필요했다.

현재 프로젝트에선 13 버전을 업그레이드하기 위한 여유가 없었는데, 다행히 현재 버전(v12.2)에서 v13에서 제공되는 [next/future/image](https://nextjs.org/blog/next-12-2#improvements-to-nextimage) 태그가 미리 지원된다는 것을 보고 바로 적용했다. 그런데 여기서 세 가지 문제가 발생하게 되었다.

1. Next 이미지 컴포넌트 사용 이슈
   - 디자이너 쪽에서 제공해준 높은 해상도 이미지를 사용하여 특히 모바일에선 쓰기 힘들정도의 속도를 경험했다.  
     (next 이미지 컴포넌트에선 width, height에 따라 자동 이미지 배율(1x, 2x, 3x...) 적용이 된다.)
   - 퀄리티를 살리기 위해 next/image 컴포넌트의 속성인 **unoptimized** 옵션을 활성화시켜 원본 이미지를 불러오니 끔찍한 이미지 렌더링 속도를 경험했다.
   - 이미지를 압축하여 사용 해보기도 했지만, **unoptimized**보다 심각한 저화질의 이미지를 사용해야 했다.
2. **next/image**에서 **span** 태그로인한 **picture** 태그 사용이 불가했던 이슈
   - 이 이슈는 **next/future/image**를 사용하면서 해결이 되었지만, 그전 **next/image**를 사용했을 때는 **img** 태그에 **span** 태그가 강제로 감싸게 되어 **img** 태그를 인식하지 못하여, 반응형 구성에 어려움이 있었다.
   - 불필요하게 웹/태블릿/모바일 화면과 무관하게 **break-point** 별로 모든 이미지를 받아오게 하여 필요 이상의 네트워크 속도에 영향을 끼치게 되었다.
3. 골치아프게 했던 **sharp** 경고문

> Warning: For production Image Optimization with Next.js, the optional 'sharp' package is strongly recommended. Run 'npm i sharp', and Next.js will use it automatically for Image Optimization.

- next에선 이미지 최적화 시 [squoosh](https://squoosh.app/)와 [sharp](https://sharp.pixelplumbing.com/)라는 이미지 최적화 라이브러리가 내장되어 있는데, 개발 런타임에선 squoosh가 사용되고, 빌드 후 런타임 환경에선 sharp 라이브러리로 대체된다.  
  (참고: [NEXT.JS의 이미지 최적화는 어떻게 동작하는가?](https://oliveyoung.tech/blog/2023-06-09/nextjs-image-optimization/))
- 내부적으로는 더 확실한 성능 차이(약 **6배 차이**)가 있기 때문에 sharp를 필수적으로 사용하게 된다. 이 프로젝트는 yarn-berry의 **zero-install**을 사용하고 있기 때문에, .yarn에 들어가지지 않은 sharp 모듈은 패키지가 "**분리**"되어 **unplugged** 폴더로 주입되어 패키지를 install 하게게 된다.
- 사실 개발 환경에선 크게 상관하지도 않았고, 일반적인 상황에선 unplugged가 없어도 무방하거니와 폴더 자체를 git에 올리지 않기에 대수롭지 않게 생각했다.(dev모드에선 squoosh가 사용되기 때문)

하지만 여기서 다음 문제가 발생하게 된다.

### **standalone과 sharp 이슈**

프로젝트에서 프로덕션 배포에 "필요한" 파일만 자동으로 복사되는 [**standalone**](https://nextjs.org/docs/pages/api-reference/next-config-js/output)을 사용하고 있다. 그런데 이 standalone이 발목을 잡게 되었는데 빌드 후 standalone의 **.yarn/cache**에서 sharp가 보이지 않는다...?  
개발환경에서만 **unplugged**로 빠진다고 생각했는데 그게 아니었던 것이다.

![[Sharp & Docker 이슈를 통한 이미지 최적화기(feat.Next.js)2.png]]

확인해보니 아래와 같은 내용을 [공식 문서](https://nextjs.org/docs/messages/sharp-missing-in-production)에서 안내가 되고 있었다.

> If sharp is already installed but can't be resolved, set the NEXT_SHARP_PATH environment variable such as export NEXT_SHARP_PATH=/tmp/node_modules/sharp. Then, build your project with next build. Finally, restart the server with either next start for production mode or node .next/standalone/server.js for standalone mode.

찾아보니 **NEXT_SHARP_PATH**를 지정해서 직접 패키지 모듈에 들어있는 sharp 패키지를 직접 접근하라는 뜻이었다.

> 번외) Vercel 배포를 사용한다면 자동으로 sharp install 가능하다.  
> Note: This is not necessary for Vercel deployments, since sharp is installed automatically for you.

당시에는 **node_modules**에 대한 솔루션과 github issue에서도 **.yarn**를 사용하는 유저들을 위한 답변을 찾을 수가 없었다. sharp 모듈을 지정하고 싶어도 그럴수가 없는 상황이었는데, zero-install을 하면서 도커에 올릴때도 기존 **.yarn**도 같이 올리게 되는데 그안에 있던 **unppluged**내의 sharp 패키지를 정적 경로로 가져오게 해봤다.

![[Sharp & Docker 이슈를 통한 이미지 최적화기(feat.Next.js)3.png]]

다행인지 모르겠지만 아래와 같이 정적 경로로 지정하니 sharp 라이브러리를 가져와 최적화 기능이 정상 작동했다. 당연히 이게 정상적인 방법이 아니라는 건 알고 있기에 이 상태로 1차 배포 후 다른 방법을 찾아보았다.

```sh
# DockerFile
ENV NEXT_SHARP_PATH=/app/.yarn/unplugged/sharp-npm-0.32.6-6b3822c437/node_modules/sharp
```

> 번외) zero-install이 아닌 yarn(v1), npm을 사용하게 되면 node_modules에선 이와 같은 이슈가 발생하지 않는다.

### **Low 버전에서의 도커 환경 이슈**

현재 회사에서 사용중인 도커 환경에선 다른 서비스가 올라가있는 환경때문에 도커 버전을 올릴수가 없었고, CI가 진행중일때 내부망의 온프레미스 서버로 접근하게 되도록 서버가 설정되어있다.

현재 프로젝트에선 CI 환경의 도커 이미지가 정상적으로 이미지 생성이 되는지 한번 확인하는 단계가있는데 이때 내부(CI)에서 보안상 문제로 **yarn install**이 불가능하도록 막혀있었다. 인프라쪽에 이야기를하여 풀어줄수는 있긴한데, 우리 프로젝트 때문에 전체 방화벽을 뚫어놓기엔 무리가 있다고 답변을 들었다.

결국 도커 내부에서 yarn install을 하지 못하니 도커 이미지가 생성되기전에 **.yarn**을 생성하여 **DockerFile**에서 **COPY**를 하도록해야했다.

```sh
# DockerFile
COPY .yarn ./.yarn
```

## **해치웠나!?**

아이러니하게도 현재 gitlab에서 레포를 관리하여 CI/CD를 진행하는 동안에선 이 문제를 타개할 방법이 도무지 나오질 않았다. 다행인 것이 마침 gitlab에서 github으로 점진적으로 옮기게 되었는데 우리 프로젝트가 가장 먼저 마이그레이션을 시작하게 되었다.

### **github으로!**

사실 마이그레이션 보다도 이 경고 메세지가 cloud watch에 필요 이상으로 많이 쌓이게되어 다른 로그를 관리 할 수가 없기도 했고, 필요없는 서버 통신 비용까지들고 있게되어 하루하루 눈치 보이는 생활이 지속되고 있었다.

![[Sharp & Docker 이슈를 통한 이미지 최적화기(feat.Next.js)4.png]]

끔직하다.

하루 빨리 이상황을 벗어나기 위해선 도커 내부에서 설치와 빌드가 되는 환경을 구성할 수 있도록 Github으로 옮겨 보다 상위 버전의 도커를 사용하여 sharp의 설치된 OS의 환경이 도커 환경과 동일해지기 때문에 지옥같은 에러 무더기에서 벗어 남과 동시에 그토록 바라던 sharp가 동작하게 될 것이다.

### **최적화 결과**

누구보다 우리 팀은 github이 정착될수 있도록 서포트하였고, 곧바로 반영 되도록 DockerFile 스크립트를 수정했고, 드디어 성공했다...! 이제 운영중에 발생하는 에러나 올바른 로그가 쌓이는지 명확히 추적이 가능해졌고, 지금까지 sharp 로그로인해 감추어졌던 로그를 확인하여 발빠른 대응을 할수 있게 되었다.

![[Sharp & Docker 이슈를 통한 이미지 최적화기(feat.Next.js)5.png]]

총 5곳의 페이지 최적화가 필요한 부분들을 선별해서 반영했고, resource 용량은 전반적으로 8MB -> 1.6MB으로 **약 20%** 가 개선되었으며, 네트워크 속도 또한 11.54s -> 4.95s로 **약 43%** 수준의 속도와 성능이 개선 되었다. 실제로 PC와 모바일 웹에서 확인 할때 보다 빠른 이미지를 불러올 수 있었고, 캐싱까지 잘 반영 되었다.

![[Sharp & Docker 이슈를 통한 이미지 최적화기(feat.Next.js)6.png]]

추가로 이미지 렌더링 속도가 개선됨에 따라 Light House 측정결과 접근성을 제외한 성능 부분에서 100을 받을 수 있었다. (이전 Light House의 결과 사진을 실수로 날려버렸지만 내 기억상 성능 부분에서 좋지 않은 점수를 받았었다.)

![[Sharp & Docker 이슈를 통한 이미지 최적화기(feat.Next.js)7.png]]

## **마치며**

이번 최적화 작업이 유독 힘들었던 이유는 Next(v12.2), yarn-berry 뿐만아니라 물리적인 서버 환경에 대한 문제를 직면했던 점이다. 사실 Next에서 발생하는 이미지 최적화 이슈는 다른 블로그에서도 많이 정리되어있었고 github issues에서도 많은 해결방법이 올라와있다.

하지만 나와 같은 예외적인 환경에 대한 경험은 보질 못했다. 도커 버전을 제어할 수 없었고 standalone, zero-install, sharp 세가지 상황이 맞물리게되면서 또 하나의 예외 케이스가 생겨버린 것이다.

이번 최적화를 진행하면서 간/직접적으로 인프라와 보안 이슈로 인해 서로간의 니즈를 경험해보았고, "일반적"이진 않지만 나와 같은 상황을 직면하는 다른 개발자 분들에게 도움이 되었으면 좋겠다.  
~(결론적으론 물리적인 상황이 바뀐게 크긴했지만...)~
