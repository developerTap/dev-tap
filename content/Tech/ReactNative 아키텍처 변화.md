---
lastmod: 2024-04-13
---

![[ReactNative 아키텍처 변화1.png]]

## **개요**

이번엔 RN(React Native)을 살펴볼 일이 생겼는데, 문득 RN이 어떤 방식으로 JavaScript에서 브라우저 엔진 없이 Native(iOS,Android)에서 상호작용과 UI가 그려지는지 궁금하게 되었다. 이번 글은 RN의 과거와 현재의 아키텍처가 어떤 식으로 구성되어 왔고, 개선된 아키텍처는 어떤 방식의 메커니즘을 가지게 되는지 정리해 보고자 한다.

웹 개발만 해 오던 분들이라면 너무 깊게 이해할 필요는 없을 것 같고, 단순히 React와 RN이 어떻게 다르게 동작하는지를 아키텍처 관점으로만 가볍게 봐도 괜찮을 것 같다.

먼저 RN의 메커니즘을 이해하기 위해선 아키텍처를 이해해야 하는데, RN은 0.68 버전 전부터 적용해 오던 **브릿지(Bridge)** 메커니즘을 적용하고 있었다. 하지만 RN 팀에서는 여러 가지 성능적 이슈와 좀 더 Native에 가까운 아키텍처 구조를 고민해 오고 있던 것 같다.

그래서 0.68 버전 이후부터는 브릿지를 걷어내고 새로운 방식의 아키텍처를 적용했고, [JSI(JavaScript-Interface)](https://reactnative.dev/architecture/glossary#yoga-tree-and-yoga-node)와 [Fabric Renderer](https://reactnative.dev/architecture/glossary#yoga-tree-and-yoga-node)라는기술을 적용하여 성능과 Native에 훨씬 더 가까운 메커니즘을 갖게 되었다.

## **RN(React-Native)이란?**

RN은 JavaScript 및 TypeScript의 도움으로 iOS 및 Android용 크로스 플랫폼 Native 모바일 애플리케이션을 만드는 데 도움이 되는 프레임워크이다.

**React와 RN(React-Native)의 동작 원리의 차이점과 공통점**

RN은 일반적인 웹 브라우저에서 동작하는 원리와는 아주 다르다. 하지만 [react-fiber 아키텍처](https://github.com/acdlite/react-fiber-architecture#what-is-a-fiber)와 같이 React의 근간이 되는 기술이 여전히 동일하다. 차이가 있다면 diffing을 하는 구조가 React에선 [Virtual DOM Tree](https://legacy.reactjs.org/docs/faq-internals.html)을 기준으로 잡는다면, RN은 [Yoga Tree](https://reactnative.dev/architecture/glossary#yoga-tree-and-yoga-node)라는 구조로 동작한다. 이때 [Shadow DOM](https://developer.mozilla.org/ko/docs/Web/API/Web_components/Using_shadow_DOM)에 대해서 알아보는 것도 추천한다.

> 실제로는 Virtual DOM과 React Shadow DOM은 다른 개념이다. [Shadow DOM은 Virtual DOM과 같은가요?](https://ko.legacy.reactjs.org/docs/faq-internals.html#is-the-shadow-dom-the-same-as-the-virtual-dom))

## **과거의 아키텍처: JS/Native Thread, Bridge**

과거에는 3가지 방식을 이해야한다.

- **JavaScript Thread**: JS 코드 번들은 JavaScript 엔진(JSC, Hermes 등)의 도움을 받아 실행
- **Native Thread**: Native UI 렌더링 및 사용자 이벤트 처리(클릭, 스와이프, 입력 등) 실행
- **Bridge**: JavaScript와 Native 간 서로 이해 할 수 없는 영역을 이어주며 통신할 수 있게하는 메커니즘이며 과거 아키텍처중 가장 중요한 개념이다.

![[ReactNative 아키텍처 변화2.png]]

완전히 다른 두 스레드(JavaScript & Native) 간 통신을 위해 **JSON**이라는 언어를 통해 비동기 방식으로 메시지를 보낸다.

#### **JavaScript 🔁 Native**

서로 화면을 렌더링하거나 이벤트 정보를 JS 측으로 보내기 위해 JSON 데이터를 Native UI 스레드를 대기열에서 대기시키고 사용하고를 반복한다.

#### **브릿지(Bridge)**

![[ReactNative 아키텍처 변화2.png]]

이 상호작용(JavaScript 🔁 Native)을 위해 필요한 개념이 브릿지이다.

> 직렬화된 메시지는 필요한 모든 데이터와 함께 Native 측에 브릿지를 통해 전송된다.
>
> JavaScript는 메시지를 수신하고 역직렬화 후 다음에 수행할 작업을 결정한다. 메시지는 요청된 작업에 대한 정보와 함께 브릿지를 통해 JavaScript 계층에 전송되며, Native 측은 메시지를 수신하고 이를 역직렬화한 후 View를 업데이트한다.

간단히 말하자면, 브릿지라는 중개자를 통해 JavaScript와 Native 간 **_서로 이해할 수 있는 언어로 변경하고 직렬화 역직렬화라는 작업_**을 통해 뷰를 보이게 되는 것이다.

#### **브릿지의 문제**

- **비동기식 문제**: 브릿지의 비동기식 작업이 극단적인 경우에 문제가 발생한다. 비동기식은 정보 교환이 빠르게 이루어지지만, 브릿지에 데이터를 제출하고 다른 쪽에서 이 작업을 비동기적으로 기다리게 된다.
- **단일 스레드 문제**: 단일 스레드에서 JavaScript 작업이 수행되는데 이는 극단적인 계산이 발생하는 경우 심각한 성능 저하가 이루어지게 된다.
- **추가 오버헤드**: 다른 쪽이 사용할 때마다 정보를 직렬화해야 하고, 다른 쪽에서는 그 정보를 역직렬화 해야한다. 단순성과 가독성을 위해 JSON 방식을 선택했지만, 오버헤드에 대한 비용을 지불해야 하는 건 어쩔 수 없는 상태다.
- **병목 현상**: 원활한 상호작용을 위해 브릿지라는 연결 통로 하나로만 통신하다 보니 병목 현상이 일어난다.
- **시작시 기본 모듈 로드**: 당연하게도 서로 다른 개체이기 때문에 JavaScript가 필요할 때 모듈을 시작할 수 없어 애플리케이션 시작 시 모든 기본 모듈을 로드해야 하는 문제가 있다.

## **새로운 아키텍처: JSI, Fabric, Turbo Modules**

![[ReactNative 아키텍처 변화3.png]]

RN 팀에선 과거 아키텍처에 대한 고질적인 문제를 해결하고자 새로운 아키텍처를 출시하게 되었다.

- 동기 실행 전환
- JSON 직렬화/역직렬화에 따른 오버헤드 제거
- 시작 로드 속도 향상
- 향상된 메모리 관리
- 적은 충돌
- Type Safe 추가

핵심적으로는 RN은 Native 모듈을 사용해서 플랫폼별 API/하드웨어에 액세스하게 되었고, 아래 4가지 주요 사항을 이해해야 한다.

#### **JSI(JavaScript Interface)**

![[ReactNative 아키텍처 변화4.png]]

새로운 아키텍처에서 브릿지를 대체한 가장 중요한 개념이다. 이는 모든 JavaScript 엔진에서 활용할 수 있는 통합되고 가벼운 법용 레이어이다. 마침내 **_Native API에 직접 연결이 가능_**하게 되었다.

> JSI는 C++로 작성되어 Native에만 국한되지 않고 C++ 작성된 모든 것들과 통합된다.

이게 무슨 말이 냐면, C++의 참조 객체를 통해 **_두 레이어(JavaScript&Native)의 소유권을 공유_**하여 각자 레이어에서 메서드를 **직접 호출**이 가능해진 것이다. 이로써 _비동기 이슈와 병목현상, 오버헤드 현상을 한 번에 해결_ 이 되었다.

#### **Fabric**

![[ReactNative 아키텍처 변화6.png]]

[**Fabric**](https://reactnative.dev/architecture/fabric-renderer)은 기존 레거시 렌더링 방식의 진화 형태이다. 핵심은 C++에서 더 많은 렌더링 로직을 통합하고, 호스트(iOS,Android) 플랫폼과의 상호 운용성을 개선하고 RN에서 사용하지 못했던 기능들을 구현할 수 있게 되었다.

렌더링 파이프라인은 **렌더링 ➡️ 커밋 **➡️** 마운트** 순으로 이루어진다.

전체 흐름을 설명하기에는 내용이 많기 때문에 공식 문서를 확인해 보는 것을 추천한다. React의 생명주기보단 간단한 개념이니 Virtual DOM과 fiber를 이해하고 있는 분이라면 빠르게 이해가 가능할 것이다.

Fabric 렌더링 파이프라인: [Render, Commit, and Mount](https://reactnative.dev/architecture/render-pipeline#react-state-updates)

#### **Turbo Module**

![[ReactNative 아키텍처 변화7.png]]

레거시 아키텍처 방식에선 시작 시 모든 애플리케이션 모듈을 로드해야한다고 했다.

새로운 아키텍처에선 터모 모듈을 적용하여 Native에서 *필요한 모듈(카메라 등)을 *로드* 할 때 요청시 애플리케이션에 필요한 Native 모듈을 요청*하여 TTI(상호 작용 시간)을 많이 개선할 수 있게 된다.

#### **CodeGen**

![[ReactNative 아키텍처 변화8.png]]

새로운 아키텍처에선 **Type Safe**가 추가되었는데, C++이라는 강력한 형식의 언어가 JavaScript와 C++간 통신을 위해 인터페이스를 생성할수 있게 되었다. 이로써 JavaScript/TypeScript에서 인터페이스 생성이 가능하게 되었다.

## **마치며**

오래전에 Expo 프레임워크를 사용하여 RN 개발을 했던 경험이 있다. 그때는 어떻게 JavaScript로 Native 플랫폼과 상호작용하며 개발이 가능하지? 라는 의문만 품은 채 넘어갔었는데, 최근에는 여러 라이브러리와 프레임워크들의 동작 방식과 아키텍처에 대해 궁금증이 많이 생겨 이번 기회에 RN 아키텍처의 변천사를 조사하게 되었다.

웹 개발에서도 Native라고 불리는 브라우저에서도 마찬가지로 이전의 브라우저 엔진과 아키텍처가 있었을 것이다. 두 가지 다른 방식의 아키텍처와 동작 방식을 살펴보니 문득 한가지 결론을 내렸다.

대부분의 렌더링 동작 방식에 대해서는 초기 모델이 하드하게 뽑혀 나오고 거기서 발생하는 니즈를 해결하여 재구축하는 단계가 필연적으로 일어난다는 것.

> 당연한 이야기라고 생각하지만, 또 다르게 생각해 보면 우리는 **처음부터 잘 만들어진 아키텍처와 구조 속**에서 개발을 해오고 있다고 생각하며 이런 환경을 제공해주는 개발자들을 위한 개발자들에게 감사함을 느끼게 된다.

과거 React도 클래스형 컴포넌트를 기점으로(물론 그 당시에도 함수형 컴포넌트가 존재하긴 했지만) 좀 더 자유롭고 성능적으로 개선하기 위해 16버전부터 함수형 컴포넌트를 개선하여 클래스형 컴포넌트의 니즈를 해결했고, 18버전에선 SSR과 동시성 등의 니즈 개선, 이번에 19 버전에선 훅과 메모이제이션 등의 니즈를 개선하는 모습을 볼 수 있다.

React와 React-Native 이 두 가지 기술의 아키텍처와 렌더링 방식을 공부하다 보니 참 비슷하면서도 다른, 무엇보다 각자의 기술 단점을 극복하기 위해 메타에서 정말 많은 고민과 노력을 알 수 있게 된 계기가 되었다.

## **참고**

- [Architecture Overview](https://reactnative.dev/architecture/overview)
- [About the New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [Render, Commit, and Mount](https://reactnative.dev/architecture/render-pipeline#react-state-updates)
- [React Native New Architecture](https://medium.com/@mishraabhishek.11/react-native-new-architecture-937c76547b29)
- [How does React Native work? Understanding the architecture](https://medium.com/front-end-weekly/how-does-react-native-work-understanding-the-architecture-d9d714e402e0)
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture#what-is-a-fiber)
