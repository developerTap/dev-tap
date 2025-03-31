---
lastmod: 2024-10-27
---

## 개요

디자인 시스템 구축을 위해 `Radix-UI` 를 사용 중인데 내부 구조를 살펴보다가 이벤트 핸들링 방식에 대해 궁금하여 오픈 소스 코드를 살펴보던 중 2년전 React가 17에서 18로 업데이트 되면서 이벤트 처리에 대한 큰 변화로인해 트러블 슈팅을 겪은 사례에 대해 알게되어 조사하게되었다. (이 글은 저의 트러블 슈팅이 아닙니다...!)

사건의 발단으로는 하나의 이슈 사항으로 인해 [PR](https://github.com/radix-ui/primitives/pull/1378)이 머지 된 사례가 있었다. 이슈로는 [`ContextMenu`](https://www.radix-ui.com/primitives/docs/components/context-menu)에 대한 일관된 동작이 이루어지지 않는 다는 것. 이는 React 18의 핵심 변경 사항 중 하나로, 모든 이벤트 핸들러에 일관되게 자동 일괄 처리([automatic batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching))를 도입한 것으로, 특정 이벤트만 일괄 처리를 적용이 가능했던 17버전과는 다른 결과를 초래했다. 때문에 Radix 측에서는 이벤트 처리를 일관되게 처리할 수 있도록 처리했다.

## 조사

### 이벤트 우선순위

React는 상호작용 유형으로(`discrete`, `continuous`, `default`)에 따라서 업데이트 [우선순위를 할당](https://github.com/facebook/react/blob/a8a4742f1c54493df00da648a3f9d26e3db9c8b5/packages/react-dom/src/events/ReactDOMEventListener.js#L294-L350)한다. `discrete`(사용자 지정 개별 핸들러)은 핸들러의 업데이트를 즉시 수행이 가능하므로, 중요한 차이점을 가진다. React에서는 이를 해결하기 위한 방식으로 `window.event`를 사용했다.

왜냐하면 사용자 `사용자 정의 이벤트` 유형은 이런 방식으로는 평가가 안되기 때문에 기본값으로 넘어가게된다. 대부분의 경우 문제가 되지 않지만 Radix의 `ContextMenu`와 같이 코드 구조가 하나의 업데이트가 다른 업데이트보다 먼저 커밋될 것으로 암묵적으로 기대하도록 되어 있다.

### 문제가 되는 이유

`ContextMenu`의 경우 잘못된 동작으로 `pointerdown`과 `contextmenu` 이벤트의 업데이트가 예기치 못하게 일괄 처리되어 발생한다. 실행 순서는 올바르게 유지되나(`pointerdown` -> `contextmenu`) 결과 상태 변경이 React 18에서 일괄 처리돼버려서 `open` 상태의 업데이트가 일어나지 않게 되었다. [effect의 cleanup](https://github.com/radix-ui/primitives/blob/f2d50b0d310fbe2168333ceff95c7f43133fe7f0/packages/react/use-body-pointer-events/src/useBodyPointerEvents.tsx#L32-L57)이 더이상 순환되지 않게되어 `false -> true`로 이동되어 `pointer-events: none;`이 제거되지 않고 `contextmenu`의 핸들러가 차단되게 된다.

### 일관성을 위한 휴리스틱

React가 업데이트 우선순위를 나누는 방식과 즉각적인 사용자 상호작용, 즉 `discrete` 이벤트의 의도가 지연되지 않도록하는 하는 것을 고려하면 `discrete` 핸들러에서 사용자 정의 이벤트 유형이 dispatch 될 때마다 `dispatchDiscreteCustomEvent`를 사용하도록 하는 것이다. 이를 권장사항으로 결정했고, 내부 우선순의는 [React의 이벤트 우선순의](https://github.com/facebook/react/blob/a8a4742f1c54493df00da648a3f9d26e3db9c8b5/packages/react-dom/src/events/ReactDOMEventListener.js#L294-L350)를 따른다.

### Event vs CustomEvent 사용

`CustomEvent`가 제공되면 이벤트 생성자의 모든 사용법을 `CustomEvent`로 변경했는데, 어느 생성자가 취약하기 때문에 스타일을 변경했다고 한다.(우선 순위는 어떤 생성자가 사용된 것이 아니라 전달된 유형으로 추론되는 것을 기억 하자) 이제 일관성을 유지하면서 `dispatchDiscreteCustomEvent` 사용 시기를 더 쉽게 결정하는 것을 기대하게된다.

```ts
// dispatchEvent 클릭 👎
target.dispatchEvent(new Event(‘click’))

//dispatchEvent CustomEvent 유형 👎
target.dispatchEvent(new CustomEvent(‘customType’))

// (권장) 개별(discrete) 핸들러 내에서 CustomEvent 유형 dispatch 👍
onPointerDown={(e) => dispatchDiscreteCustomEvent(e.target, new CustomEvent(‘customType’))}
```

이는 `Radix-UI/Primitive`에 유틸성 함수로 추가되었고, 연쇄적으로 상호작용이 일어날 수 있는 모든 컴포넌트(예:  ContextMenu, SelectMenu, Toast, Dialog 등) 모두 `[dispatchDiscreteCustomEvent](https://github.com/radix-ui/primitives/blob/main/packages/react/primitive/src/Primitive.tsx#L94)`를 기본으로 사용된다.

내부는 아래와 같이 `ReactDOM.flushSync`를 통해 구현된다. flushSync를 사용하게된 이유로는 React가 18로 넘어오게 되면서 이벤트가 수행되는 순서가 바뀌고 특정한 상황에 경쟁 조건이 이루어지게 된다. 때문에 React에서 CustomEvent가 업데이트 우선순위를 결정하기 위해 `window.event`를 사용하기 때문에 모든 사용자 정의를 동기적 업데이트 수행을 위해 flushSync 적용이 합리적이라 판단했다고한다.

```ts
// 해결 코드
function dispatchDiscreteCustomEvent<E extends CustomEvent>(target: E["target"], event: E) {
  if (target) ReactDOM.flushSync(() => target.dispatchEvent(event))
}
```

> 위 내용은 해당 글([Wrap custom events dispatching with flushSync](https://github.com/radix-ui/primitives/pull/1292))을 참고하면된다.
>
> TIL을 하면서 [코드를 분석한 글](https://github.com/radix-ui/primitives/blob/main/packages/react/primitive/src/Primitive.tsx#L94)이 있어 참고 자료로 확인해봐도 좋다.

### 예제 코드로 이슈 살펴보기

컨트리뷰터는 재현과 해결을 위해 [비교 코드를 공유](https://codesandbox.io/s/batching-simple-euprqh?file=/src/App.js)해 주었는데, 어떤 상황이 발생하는지 살펴보자. 

먼저 의도한대로 작동 되는 17버전 당시 작동하던 코드이다.

![[React의 Automatic Batching에 의한 문제 해결 사례1.gif]]

콘솔을보면, 처음 클릭 결과 값과 다음 클릭 결과 값이 다른 것을 확인 할 수 있다. 이렇게  CustomEvent와 Natvie 이벤트가 결합된 상황에서`pointerdown`와 `contextmenu`의 이벤트가 별도로 동작해야 각각의 이벤트 별로 사용자 제어가 가능하다.

```tsx
function dispatchEvent(name, handler, target) {
  const event = new Event(name)
  if (handler) target.addEventListener(name, handler, { once: true })
  target.dispatchEvent(event)
}

function dispatchCustomEvent(name, handler, target) {
  const event = new CustomEvent(name, {
    bubbles: false,
    cancelable: true,
  })

  if (handler) target.addEventListener(name, handler, { once: true })
  target.dispatchEvent(event)
}

function OneCustomOneNative() {
  const [open, setOpen] = React.useState(false)

  console.log(open)

  React.useEffect(() => {
    const handlePointerDown = (event) => {
      dispatchEvent(
        "pointerdown",
        () => {
          console.log("pointerdown")
          setOpen(false)
        },
        event.target,
      )
    }

    const handleContextMenu = (event) => {
      dispatchCustomEvent(
        "CUSTOM_EVENT2",
        () => {
          console.log("contextmenu")
          setOpen(true)
        },
        event.target,
      )
    }

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [setOpen])

  return <div className="box">Right click me</div>
}
```

문제의 18버전에서 일괄 처리되는 문제를 살펴보자.

![[React의 Automatic Batching에 의한 문제 해결 사례2.gif]]

언뜻 보면 일관된 콘솔 값이 나와서 정상으로 착각할 수 있지만, 두 이벤트가 별개의 동작을 제어하지 못하는 상황이 생겨 문제가 발생해버린 것이다.

```tsx
/* 생략 */
function TwoCustomEvents() {
  const [open, setOpen] = React.useState(false)

  console.log(open)

  React.useEffect(() => {
    const handlePointerDown = (event) => {
      dispatchCustomEvent(
        "CUSTOM_EVENT1",
        () => {
          console.log("pointerdown")
          setOpen(false)
        },
        event.target,
      )
    }

    const handleContextMenu = (event) => {
      dispatchCustomEvent(
        "CUSTOM_EVENT2",
        () => {
          console.log("contextmenu")
          setOpen(true)
        },
        event.target,
      )
    }

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [setOpen])

  return <div className="box">Right click me</div>
}
```

## 정리

React 18에선 자동 일괄 처리(automatic batching)를 도입하여, 성능 향상을 위해 여러 상태의 업데이트를 하나의 리렌더링으로 그룹화하였다. 이 기능이 없었을 당시 React 이벤트 핸들러 내부의 업데이트만 일괄 처리 했는데, 이 기능이 도입이 되면서 다양한 비동기 처리, 네이티브 이벤트 핸들러 또는 기타 이벤트 내부 업데이트가 일괄 처리되지 않은 문제를 해결했다고한다. 

하지만 Radix에서는 일괄처리 되지 않은 기능을 기대하여 비지니스 로직을 구성하였고, 그에 따른 이슈가 생긴 것이다. 동작 방식에 대한 근본적인 이슈임에도 불구하고, React의 업데이트 우선순위를 체크하여 CustomEvent와 같이 Radix 내부에서 개별적인 이벤트 동작 방식을 일괄 처리되지 않도록 CustomEvent용 `dispatchDiscreteCustomEvent` 이벤트를 만들었고, React의 권장사항은 아니지만 특수성에 맞게 `ReactDOM.flushSync`를 실제로 활용한 것도 놀랍지만 코드 한 줄만 추가된 유틸 함수만으로 자동 일괄 처리를 우회하는 방식을 생각해낸 것도 놀라웠다.

React를 기반으로한 대다수의 UI 라이브러리에서 이와 같은 문제를 겪을 것으로 예상된다. 특히 Radix와 같이 Headless UI로 작성되어 범용적으로 사용가능한 라이브러리라면 언제든 발생할 수 있는 문제라고 생각된다. 이벤트 처리 방식과 대처능력에 감탄하며, 범용적인 라이브러리를 만들때는 역시 core 기술의 가장 근본적인 로직을 이해하고 있어야함을 깨닫게 된다.
