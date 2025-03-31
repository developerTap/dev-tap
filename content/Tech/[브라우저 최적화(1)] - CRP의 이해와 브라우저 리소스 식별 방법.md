---
lastmod: 2024-11-24
---

웹 페이지는 최초 렌더링 단계나 네트워크에서 렌더링/파서 차단(redner-blocking, parser-blocking)을 어떻게 다루냐에 따라 성능에 크게 좌우가 된다. 그 중에서 CRP(Critical Rendering Path)가 어떻게 흘러가는지 이해하고, HTML 속성과 CSS 처리 옵션을 다룰 줄 알면 사용자 경험을, 개선을 크게 향상 시킬 수 있다.

이번 글에선 브라우저 렌더링 단계에서 CRP가 무엇이고 어떤 단계에서 리소스가 차단되는지 그리고 렌더링 우선순위를 어느 위치에 잡아야 하는지 알아보고 브라우저에서 제공하는 기능들을 통해 브라우저 리소스 로딩을 최적화하는 방법을 알아보자.

# CRP(Critical Rendering Path)

CRP란 브라우저가 서버로부터 HTML, CSS, Javascript를 받아 화면에 "픽셀로 변화하는 일련의 단계" 또는 "화면을 그리기 위해 실행하는 과정"을 말한다.

설치형 네이티브 앱과 달리 브라우저는 웹 서버상 자유롭게 배포되어 있어 페이지 렌더링에 필요한 모든 리소스가 있는 웹 사이트에 의존할 수밖에 없다.

따라서 브라우저에 일부 HTML만 존재할 때(CSS 또는 Javascript가 있는 경우) 최대한 빨리 렌더링 되려면 페이지가 잠시 깨져 최종 렌더링을 위해 크게 변화된다. 이는 더 나은 UX를 제공하는 초기 렌더링에 필요한 리소스를 더 많이 확보할 때까지 처음에 빈 화면을 보여주는 것보다 UX에 더 좋지 않다. 반면 순차적 렌더링을 수행하는 대신 모든 리소스를 대기하면 이 또한 UX에 좋지 않다.

즉, 브라우저는 최소한의 리소스 수를 알고, 사용자가 오래 기다리지 않는 상태에서 콘텐츠를 표시하면 안 된다. 이를 수행하기 위해 거치는 단계가 바로 `주요 렌더링 경로(CRP)`다.

## CRP 경로

![[crp.svg]]

- HTML에서 `DOM(Document Object Model)` 생성
- CSS에서 CSS 개체 모델 (`CSSOM`) 생성
- DOM 또는 CSSOM을 변경하는 `Javascript` 실행
- DOM 및 CSSOM에서 `Render Tree` 생성
- 페이지에서 `Style` 및 `Layout` 작업을 실행하여 어떤 요소가 어디에 적합한지 확인
- 메모리에 있는 요소의 픽셀을 `Paint`
- 픽셀이 겹치는 경우 `Composite`
- 모든 결과 픽셀을 화면에 `물리적으로 페인트(Display)`

각 순서에 따라 어떤 방식으로 흘러가는지 트리 형식으로 잘 설명한 [CRP 이해하기](https://bitsofco.de/understanding-the-critical-rendering-path/) 글을 살펴봐도 좋다.

위 렌더링 프로세스는 여러 번 발생하게 된다. 초기 렌더링에 이 프로세스를 호출하지만, 페이지 렌더링에 영향을 미치는 리소스가 더 많이 사용되면 브라우저는 이 중 일부만 다시 실행(`Reflow/Repaint`)해서 업데이트한다.

## CRP 리소스 종류

브라우저는 초기 렌더링을 완료하기 위해 아래 리소스가 다운로드될 때까지 기다린다.

- HTML의 일부
- `<head>` 요소의 Rendering-Block CSS
- `<head>` 요소의 Rendering-Block Javascript

요점은 브라우저가 HTML을 `스트리밍` 처리한다는 것이다.

초기 렌더링 이후에는 브라우저는 일반적으로 아래 작업을 기다리지 않는다.

- HTML 문서
- 폰트
- 이미지
- `<head>` 요소 외부의 *Non-render-blocking JavaScript* (예: HTML 끝에 배치된 `<script>` 요소)
- `<head>` 요소 외부의 *Non-render-blocking CSS* 또는 *현재 표시 영역에 적용되지 않는 [media 속성 값이 포함된 CSS](https://developer.mozilla.org/ko/docs/Web/HTML/Element/link#conditionally_loading_resources_with_media_queries)*

폰트와 이미지는 브라우저 렌더링 중에 채워지는 콘텐츠로 간주하는 경우가 많아 초기 렌더링에는 포함할 필요가 없다. 하지만 텍스트가 숨겨진 상태에서 폰트 사용이 가능하거나 이미지를 사용할 때까지 초기 렌더링 시 공간이 남는 경우가 있는데 이는 CLS(Cumulative Layout Shift) 측정에 좋지 않은 점수를 얻게 된다.

`<head>` 는 CRP 처리시 핵심 역할을 하고, 이 요소 내부 콘텐츠를 최적화하는 것이 **`웹 성능 최적화의 핵심`** 이라고 볼 수 있다. 하지만 `<head>` 에 참조된 모든 리소스가 반드시 초기 렌더링에 필요한 건 아니고 브라우저는 필요한 리소스만 기다린다. 중요한 리소스를 식별하려면 `렌더링 차단(render-blocking), 파서 차단(parser-blocking), CSS, Javascript`를 이해해야 한다.

## 렌더링 차단(render-blocking) 리소스

CSS는 기본적으로 주요 리소스로 판단되기 때문에 렌더링 차단 요소중 하나다. CSS(`<style>` 요소의 inline CSS 또는 `<link=stylesheet href='...'>` 요소에 지정된 `외부 참조 리소스`)를 확인하면 다운로드가 완료될 때까지 콘텐츠를 렌더링하지 않는다.

아래는 네이버 홈페이지를 초기 렌더링할때의 네트워크 모습니다. 네모 박스를 친 영역이 CSS를 렌더링하는 모습인데, 뒤에 여러 개의 바는 CSS보다 초기 렌더링 우선순위가 낮거나 병렬로 리소스를 불러오는 모습이다.
![[Pasted image 20241124155331.png]]

개발자 도구의 요소 탭을 확인해 보면 `main.d2a35f78.css` 파일이 `link` 태그에 선언된 것을 볼 수 있다.
![[Pasted image 20241124155513.png]]

> 참고: CSS는 기본적으로 렌더링을 차단하지만, `<link>` 요소의 media 속성을 변경하면 현재 조건(`<link rel=stylesheet href='...' media=print`)과 일치하지 않는 값을 지정하면 렌더링을 차단하지 않는 리소스로 전환이 가능하다.

최근 브라우저의 발전으로 [`blocking-render`](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#blocking-attributes)과 같이 요소 처리가 될 때까지 `<link>, <script>` 또는 `<style>` 요소를 렌더링 차단한다는 명시적 표시가 가능하고 리소스 다운로드 중 파서가 계속해서 문서를 처리하도록 허용할 수 있게 되었다.

## 파서 차단(parser-blocking) 리소스

Javascript 실행 시 DOM 또는 CSSOM을 변경할 수 있기 때문에 Javascript는 파서를 차단하여 브라우저가 실행할 다른 작업을 찾지 못하게 할 수 있다. ([asynchronous](https://developer.mozilla.org/ko/docs/Web/HTML/Element/script#async) 또는 [deferred](https://developer.mozilla.org/ko/docs/Web/HTML/Element/script#defer)으로 표시된 경우 제외한다)

파서를 차단하면 단순히 렌더링 차단 이상으로 비용이 많이 발생할 수 있다. 기본적으로 HTML은 파서가 차단되는 동안에는 브라우저에  [preload scanner](https://yceffort.kr/2022/06/preload-scanner)라고 하는 보조 HTML 파서를 사용하여 향후 리소스를 미리 다운로드해서 비용을 줄일 수 있다. 실제로 HTML을 파싱하는 것보다 좋지 않지만, 네트워크 함수가 차단된 파서보다 먼저 작동하면 다시 차단될 가능성이 작다.

# 차단 리소스 식별

개발자 도구의 네트워크 탭으로 확인이 가능하지만 [WebPageTest](https://www.webpagetest.org/)라는 서비스에서 측정하고 싶은 페이지의 리소스 우선순위나 웹 바이탈 코어 점수 확인이 가능하다.

이번에도 네이버 홈페이지를 측정해봤다. (참고: [WebPageTest 네이버 페이지 측정 페이지](https://www.webpagetest.org/result/241124_BiDcFC_2C9/1/details/))
![[Pasted image 20241124162201.png]]

리소스 URL 왼쪽에 주황색 원에 X표시 되어 있는 부분이 렌더링 차단 리소스를 말한다. 렌더링 시작 전에 모든 렌더링 차단 리소스를 다운하고 처리해야하고, 그 이후 폭포수 모양의 짙은 녹색 선으로 표시된다.

# CRP를 최적화해야하는 논리적 근거

CRP를 최적화하려면 HTML을 수신하는데 걸린시간 [TTFB(Time to First Byte)](https://web.dev/articles/ttfb)을 줄이고 렌더링 차단 리소스를 줄여야한다.

오랜동안 CRP는 `초기 렌더링`과 관련이 있었지만 [사용자 중심 지표(user-centric metrics)](https://web.dev/articles/user-centric-performance-metrics)가 등장하면서 웹 성능을 위하기보단 CRP의 종점이 첫 번째 페인트([FCP](https://developer.mozilla.org/ko/docs/Glossary/First_contentful_paint))인지? 아니면 그 이후에 이어지는 큰 콘텐츠가 많은 페인트([LCP](https://developer.mozilla.org/ko/docs/Glossary/Largest_contentful_paint)) 중 하나인지 의문이 제기되었다고 한다.

대안으로는 콘텐츠가 많은 렌더링 경로(또는 다른 사람들이 핵심 경로라고 부르는)의 일부로서 LCP 또는 FCP까지만 측정하는 것. 이 경우에는 CRP의 일반적인 정의처럼 반드시 차단할 필요는 없지만 콘텐츠가 풍부한 페인트를 렌더링하는 데 필요한 리소스를 포함해야 할 수 있다.

“중요(Critical)" 에 대한 정확한 정의와 관계없이 초기 렌더링과 핵심 콘텐츠를 유지하는 요소를 이해하는 것이 중요하다. 첫 번째 페인트는 사용자를 위해 무엇이든 렌더링할 수 있는 첫 번째 기회를 측정한다.

예를 들어 배경색과 같은 의미 있는 것이 이상적이지만, 콘텐츠가 없더라도 사용자에게 무언가를 제시하는 데 필요한다면 전통적으로 정의된 CRP를 측정할 수 있는 근거가 된다. 동시에 주요 콘텐츠가 사용자에게 표시되는 시점을 측정하는 것도 의미가 있다.

# 정리

개발하다 보면 운영 단계로 넘어가게 되고 최적화 단계를 진행할 것이다. 그 중 첫 번째로 수행할 수 있는 것이 브라우저 최적화 단계라고 생각한다. 이를 수행하기 위해선 가장 먼저 CRP에 대해 이해해야 하고, 리소스가 다운로드되고 차단 되는 이유에 대해서 알아야 한다.

이번 장에선 CRP에 대해 이해하고, 지표를 어떻게 확인하고 측정해야 하는지 그리고 현시점에서 CRP 최적화를 어떤 기준에서 해야 하는지 논리적 근거를 바탕으로 정리해 봤다. 다음 장에선 브라우저 리소스 로딩을 어떻게 최적화할 수 있는지 알아보자.
