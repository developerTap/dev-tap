---
lastmod: 2025-02-03
tags:
  - type-safe
  - polymorphic
  - 다형성
  - 디자인시스템
---

이번 글은 [[실용적인 사내 디자인 시스템 설계와 사용 그리고 확장성]]과 연결되며, 디자인 시스템에서의 확장성에 대한 내용이다보니 기술 글로 분류하여 작성해본다.

이제 컴포넌트의 `다형성`을 지원하는 구조에 대해 알아보자. 필자는 실제 적용 시 많이 참고했던  
 [Type-Safe하게 다형성 지원하기](https://f-lab.kr/blog/polymorphism-with-type-safe), [Polymorphic한 React 컴포넌트 만들기](https://kciter.so/posts/polymorphic-react-component/)를 기준으로 정리했다.

`Polymorphism` 컴포넌트는 말 그대로 `여러 형태를 가지는 컴포넌트`이다.

- 하나의 컴포넌트에 다양한 `시멘틱`을 표현할 수 있는 UI 컴포넌트
- 하나의 컴포넌트에 다양한 `속성`을 가질 수 있는 UI 컴포넌트
- 하나의 컴포넌트에 다양한 `스타일`을 있는 UI 컴포넌트

즉 `동일한 디자인 UI 컴포넌트`를 상황에 맞게 시멘틱한 속성을 다르게 사용할 수 있고, `button` 태그이지만 `a` 태그처럼 특수한 상황에 따라 다양한 방식으로 사용할 수 있는 특수한 용도로 사용할 수 있게 `추상화`한 구조를 말할 수 있다. 쉽게 말해서 `다형성(Polymorphism)`이란 `하나`의 일만 하는 컴포넌트를, 추상화를 통해 Polymorphic한 형태의 컴포넌트를 말한다.

![[실용적인 사내 디자인 시스템 설계와 사용 그리고 확장성6.png]]

대부분의 다형성을 지원하는 디자인 시스템을 뜯어보면 위와 비슷한 구조를 가지게 된다. 사용처에서는 상황에 맞는 `Specific Element`를 내려받을 수 있게 하고, UI 컴포넌트에선 그대로 `Style` 컴포넌트로 내려받아 내부적으로 변환하여 작성할 수 있다.

### 문제 인식

이런 요구사항이 언제 있을까?

시스템을 구축하는 과정에서 마크업 개발자와 논의하면서 동일한 디자인의 버튼 컴포넌트에서 `a` 태그의 역할을 하는 디자인이 생기게 되었다. 단순하게는 버튼의 이벤트 핸들러에 라우팅 하는 핸들러를 집어넣으면 해결되는 문제였다.

하지만 이런 요구가 점차 많아지게 되고, 그렇다고 링크용 버튼을 새로 만들자니 동일한 디자인과 비슷한 인터페이스를 가지는 UI 컴포넌트를 관리하기가 번거롭다고 생각되었다. 이때 styled-components의 [`as`](https://styled-components.com/docs/api#as-polymorphic-prop) 속성을 알게 되었는데 이 속성의 다형성을 지원하기 위해 컴포넌트에 적용되는 스타일을 유지하고 최종적으로 핸들이 되는 내용으로(다른 HTML 태그 또는 다른 사용자가 정의한 컴포넌트)만 바꾸기 위해 `런타임`시 변경할 수 있도록 제공해 주는 기능을 알게 되었다.

쉽게 말해 아래처럼 `div` 컴포넌트를 as 구문으로 사용자 정의를 통해 `button` 태그로 렌더링시켜 스타일을 동일하게, 하지만 더 시멘틱한 구조로 버튼 구조를 변경해서 사용할 수 있게 된다.

```tsx
const Component = styled.div`
  color: red;
`

render(
  <Component as="button" onClick={() => alert("It works!")}>
    Hello World!
  </Component>,
)
```

### Polymorphic하게 확장하기

다형성 인터페이스를 구축하기 위해 단계를 잡아보자.

- `as` props을 받을 수 있도록 인터페이스를 구성하고, `ElementType`을 통해 as 구문의 Element 타입을 추론한다.

  ```tsx
  type AsProp<T extends React.ElementType> = {
    as?: T
  }
  ```

- `as` props를 받는 인터페이스 `AsProp`와 실제 Button의 Props로 받는 인터페이스를 [`(&)교차 타입`](https://typescript-kr.github.io/pages/unions-and-intersections.html)을 통해 필요한 기능만을 가진 `단일 타입`으로 결합해 `Mixin 패턴`을 가지게 하여 key 정보만 받는 `KeyWithAs` 타입을 구성한다.

  ```tsx
  type KeyWithAs<E extends React.ElementType, Props> = keyof (AsProp<E> & Props)
  ```

- 리액트로 구성된 대부분의 Primitive한 컴포넌트는 `Ref`를 가질 수 있다. 따라서 Ref를 가질 때와 가지지 않을 때의 인터페이스 타입이 달라지는데, 다형성 추상화 구현 시 이를 구분하기 위해 먼저 내려받는 Element Type을 기준으로 Ref 타입을 추론할 수 있도록 구분한 타입을 구성한다.

  ```tsx
  type PolymorphicRef<C extends React.ElementType> = React.ComponentPropsWithRef<C>["ref"]
  ```

- 마지막으로 사용처에서 Ref 포함 여부에 따라 다형성 컴포넌트를 제어할 수 있도록 두 가지 타입을 구성한다.

  ```tsx
  // Ref 미사용 시
  type PolymorphicComponentProps<E extends React.ElementType, Props = {}> = (Props & AsProp<E>) &
    Omit<React.ComponentPropsWithoutRef<E>, KeyWithAs<E, Props>>

  // Ref 사용 시
  type PolymorphicComponentPropsWithRef<E extends React.ElementType, Props = {}> = Props & {
    ref?: PolymorphicRef
  }
  ```

전체적으로 정리해 보면 아래와 같은 구조를 가지게 된다.

```tsx
import { type ComponentPropsWithoutRef, type ComponentPropsWithRef, type ElementType } from "react"

// Element Type을 기준으로 as 타입을 추가 추론
// as 타입에 따라 추가로 따라오는 html 속성을 타입 추론이 가능하게 하도록 유도한다.
// 예) as='a'시 href, target 속성 추가 가능
type AsProp<T extends React.ElementType> = {
  as?: T
}

// AsProps + Props의 keyof 정보만 별도 분리
type KeyWithAs<E extends React.ElementType, Props> = keyof (AsProp<E> & Props)

// 다형성 컴포넌트 타입 정의
// 컴포넌트의 Ref 함수의 분리를 위해 Element Type을 기준으로 ref가 포함된 타입에서 'ref' 타입 별도 분리
type PolymorphicRef<C extends React.ElementType> = React.ComponentPropsWithRef<C>["ref"]

// 컴포넌트의 ComponentPropsWithoutRef 타입에서 기존 ElementType, Props 타입을 제거한 다형성 타입 정의(사용처에서 해당 타입을 재정의하기 위함)
type PolymorphicComponentProps<E extends React.ElementType, Props = {}> = (Props & AsProp<E>) &
  Omit<React.ComponentPropsWithoutRef<E>, KeyWithAs<E, Props>>

// 컴포넌트 타입 Props와 ref 타입을 추가한 다형성 타입 정의
type PolymorphicComponentPropsWithRef<E extends React.ElementType, Props = {}> = Props & {
  ref?: PolymorphicRef<E>
}
```

마지막으로 `Button` 컴포넌트에서는 Element Type과 다형성을 구성할 ButtonProps을 확장해 `PolymorphicComponentProps`타입을 조합하고, 마지막으로 Ref 구조를 가지는 컴포넌트이므로 `PolymorphicComponentPropsWithRef` 타입을 확장한 `ButtonType`을 구성하여 컴포넌트의 타입 선언(type annotation)을 통해 더욱 강력한 타입을 구성하여 Type-Safe한 구조를 구성할 수 있게 되었다.

```tsx
// Button.tsx
type PolymorphicButtonProps<E extends React.ElementType> = PolymorphicComponentProps<
  E,
  ButtonProps
>;

type ButtonType = <E extends React.ElementType = 'button'>(
  props: PolymorphicComponentPropsWithRef<E, PolymorphicButtonProps<E>>
) => React.ReactNode | null;

const Button: ButtonType = memo(
  forwardRef(
    <E extends React.ElementType>(
      {
        as,
        ... // 동일한 코드
      }: PolymorphicButtonProps<E>,
      ref?: PolymorphicRef<E>
    ) => {
...
return (
    <ButtonContainer
        ref={ref}
        // 동일한 코드
        ...
    >
	// 동일한 코드
    {...}
    </ButtonContainer>
    )}
);
```

이제 실제 사용처에서는 ref의 Element 타입을 통해 어떤 타입이 내려갈지 추론할 수 있게 되었고, 만약 `as`를 통해 `a` 태그와 관련된 구조라면 type intelligence를 통해 `href`와 `target` 속성이 통해 추론이 가능해진다.

```tsx
const ref2 = useRef<HTMLAnchorElement>(null)
;<Button
  ref={ref2}
  label="anchor:tag > Go Google!"
  color="secondary"
  as="a"
  href="https://www.google.com"
  target="_blank"
/>
```

또한 기존에 `Link` 태그와 `Button` 태그 모두 사용해 레이어를 늘렸다면 아래와 같이 `Link` 컴포넌트를 직접 주입하여, 해당 속성을 `Button` 태그에 그대로 사용하게 되어 개선할 수 있게 된다.

```tsx
// 기존
<Link href={EXTERNAL_BASE_URL.STUDIO + 'project/new'}>
  <Button
    label={t('ws_Create an Avatar Video')}
    size="sm"
    style={{ margin: '12px auto 0' }}
  />
</Link>
// 개선 후
<Button
  label={t('ws_Create an Avatar Video')}
  size="sm"
  style={{ margin: '12px auto 0' }}
  as={Link}
  href={EXTERNAL_BASE_URL.STUDIO + 'project/new'}
/>
```

## 마무리

디자인 시스템은 "시스템"화 되어있는 상태를 유지함에 따라 UI/UX의 자유도를 제한해야하는 경우가 많아진다. 이를 극복하기 위해서는 개발자가 디자인과 사용성을 유지하면서 디자인 시스템을 제공할 수 있어야한다. 

디자인은 같지만 결과는 다르게 요청을 받게되면, 초기에는 중복되는 디자인 코드와 기능을 분리하고, 점차 