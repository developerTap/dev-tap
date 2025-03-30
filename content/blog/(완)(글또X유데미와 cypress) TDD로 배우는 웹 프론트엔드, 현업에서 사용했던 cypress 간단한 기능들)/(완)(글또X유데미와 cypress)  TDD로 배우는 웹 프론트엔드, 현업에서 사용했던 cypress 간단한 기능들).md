> 본 강의는 글또를 통해 무료로 지원받은 유데미 강의입니다.

  

![[유데미글또.webp]]

  

> TDD(Test Driven Development), 작성하고자 하는 코드가 어떤 일을 할 것인지를 묘사하고 동작을 검증할 테스트 코드를 먼저 작성하고 빠르게 테스트를 진행하는 방법

  

아직 많은 프론트엔드 개발자에게 있어서 테스트 코드와 테스트 프로세스를 적용하는 것에 있어서 선뜻 수행하기가 쉽지 않은 게 현실인 것 같다. 게다가 TDD요? 라는 말이 나올정도이니...

  

웹 프론트엔드 개발자 입장에서 수많은 경우의 수가 존재하는 환경(브라우저, 모바일, 태블릿 디바이스 등)의 유저 인터렉션을 테스트하기란 정말 쉽지 않은 환경이라고 생각한다. (하기 싫어서 안 하는 것도 있겠지만...)

  

사실 정말 필요한 프로세스나 서비스는 꼭 필요한 과정이 테스트다. 필자도 테스트를 깊게 적용해 보진 않았지만 이것 저것 찍먹으로 해봤던 경험이 있다 보니 제대로 된 테스트 강의를 수강하고 싶었고, 감사하게도 유데미에서 글또 참여자들에게 무료로 두 개의 강의 수강할 수 있는 기회를 제공해 주었고, 평소 테스트에 관심을 가지고 있던 터라 테스트 강의만 두 개를 수강하게 되었다.

  

이번에 리뷰하게 될 강의는 "TDD로 배우는 웹 프론트엔드"이며, 두 번째로 수강한 강의인 "React Query / TanStack Query : React로 서버 상태 관리하기"가 있으나 완강은 아직 못한 상태라 첫번째 강의만 리뷰 할 예정이다.

  

> E2E(end-to-end) 테스트는 외부 인터페이스와의 통합과 함께 전체 소프트웨어를 처음부터 끝까지 검증하는 소프트웨어 테스트 방법입니다.

  

마지막으로는 강의 내용과 별개로 필자가 현업에서 [cypress](https://docs.cypress.io/)를 사용하면서 e2e 테스트 시 유용했던 방식을 공유하고자 한다.

  

# 강의 구성 및 실습 결과물

  

총 세 개의 섹션으로 나뉘어 있으며, 간단한 이론과 실습을 같이 진행한다. 마지막 세션으로는 수강생과 함께 크롤링을 하면서 프로그램을 만드는데 갑자기 이게 왜 튀어나왔는지 모르겠다.

  

1,2 섹션에서는 짧고 빠른 호흡으로 진행되며, Javascript와 cypress를 이용하여 간단한 계산기 기능을 가지고 테스트를 진행한다. 정말 쉬우며, 테스트 문서도 보기 어렵고 어떻게 해야 할지 모르겠다! 라는 초보자가 수강하기에 적합한 구성이다.

  

![[Pasted image 20240325220738.png]]

  

섹션2까지 완강하고 나면 cypress를 사용해서 실제 계산기가 e2e 테스트가 돌아가는 모습을 확인할 수 있다.

  

![[실습자료.mov]]

  

cypress를 처음 접해보거나 e2e 테스트가 어떤 식으로 돌아가는지 모르시는 분들이라면 위 영상과 강의를 참고하면 도움이 될 것 같다. 앞서 말했듯이 강의가 짧고 쉬워 "초보자"용이라고 생각하고 수강하면 될 듯하다.

  

# 수강 후기

[이 강의 TDD로 배우는 웹 프론트엔드](https://www.udemy.com/course/tdd-for-frontend/)는 대상 수강생 수준을 "중급자 수준"이라고 표기되어 있지만 "초급자 수준"이라고 생각하면 된다. 타입스크립트를 아직 사용하기 버겁거나, jest나 react-testing-library같이 단위 테스트나 e2e 테스트 경험이 전무한 사람 대상이라면 좋은 강의가 될 것 같다. 그런데 좀 의아한 게 섹션 3은 TDD와 아무 연관이 없는 섹션이다. 파이썬처럼 간단한 자동화 프로그램을 수강생들과 함께하는 영상인데 새로운 내용이다 보니 보긴 했지만, 강의 주제와는 많이 벗어난 내용이라 아쉬운 섹션이라 생각한다.

  

결론만 따지자면 냉정하게 나한테 맞는 강의는 아니었다. Javascript를 주제로 한 테스트 강의 찾기가 쉽지 않다 보니 기대를 많이 했으나, 유데미에서 제공하는 외국 테스트 강의가 좀 더 높은 수준의 강의를 제공했던 것 같다.

  

좀 더 프론트엔드 스택에 알맞게 react, redux, react-query 등의 테스트 강의를 보고 싶다면 필자가 추천하는 강사 [bonnie-schulkin](https://www.udemy.com/user/bonnie-schulkin/)의 강의를 보는 것을 추천한다. 이 강사의 두 개 강의를 수강했고 세 번째 강의를 수강 중인데 괜찮은 코드 퀄리티와 강의를 제공해 준다. 글또에서 제공받은 강의 중 하나이며 현재 수강 중이다.

  
  

# 현업에서 사용했던 간단한 cypress 기능들

  

e2e 테스트 툴을 사용한다면 cypress나 [playwright](https://playwright.dev/)를 사용할 것이다. 필자는 e2e 테스틀 위해 cypress를 적용했고, 사용하기 전에 적용하면 좋았던 설정과 유용했던 방법들을 알리고자한다.

  

## custom-commands

보통 테스트 툴은 많은 [커멘드 명령어](https://docs.cypress.io/api/table-of-contents)가 있고 그 명령어를 따라야지만 테스트가 동작이 된다. cypress도 마찬가지로 특유의 커맨드가 있고 jest와 RTL와 비슷한 커멘드를 사용하기도 하니 큰 어려움은 없을 것이다.

  

그 중에서 많이 사용될 [`get`](https://docs.cypress.io/api/commands/get) 명령어라고 생각하는데 querySelector의 역할 정도 생각하면 된다. get을 사용하지 않고, [find](https://docs.cypress.io/api/commands/find)~ 명령어를 사용해도 되는데 능수능란하게 테스트 코드를 작성하지 못했던 터라 `test-id` 속성을 주어 테스트를 많이 했고, 그러기 위해선 get 명령어를 자주 사용했다.

  

이게 정석적인 작성 방식이라고는 생각하지 않는다. 하지만 초반에는 이런 식으로 작성을 많이 했는데, 중복되는 코드도 많기도 하고 가독성이 많이 떨어지는 작성 방식이었다.

```ts

it('No11. Password Box Placeholder Check', () => {

cy.get('[test-id=password]')

.should('have.attr', 'placeholder')

.then((data) => expect(data).to.equal('비밀번호'));

cy.get('[test-id=email]').clear();

});

it('No13. Password max length => 20 Check', () => {

cy.get('[test-id=password]').type('1234');

cy.get('[test-id=password]').then((data) => {

expect(String(data.val()).length).to.equal(20);

});

```

  

이때 사용하면 좋은 게 cypress에서 제공하는 [custom commands](https://docs.cypress.io/api/cypress-api/custom-commands#__docusaurus_skipToContent_fallback)이다.

기존 cypress에서 사용하는 명령을 덮어 씌어 커스텀 API를 사용할 수 있게 만든다.

  

```ts

// cypress/support/commands.ts

  

// test-id 명령어를 _로 간소화

Cypress.Commands.add('_', (value: string) => {

return cy.get(`[test-id="${value}"]`);

});

  

// data-testid 명령어를 __로 간소화

Cypress.Commands.add('__', (value: string) => {

return cy.get(`[data-testid="${value}"]`);

});

  

// axios 호출 후 status와 body에 대한 공통 기댓값과 axios 호출 상태 자동화

Cypress.Commands.add('axiosStatus', (response: AxiosResponse) => {

expect(response).to.have.property('status', 200);

expect(response).to.have.property('body');

return isSuccessStatus(response.status);

});

```

  

추가로 타입스크립트를 사용한다면 index.d.ts를 두어 타입 추론이 가능하도록하자. 이처럼 Cypress의 Chainable 인터페이스를 선언해 두면, 커스텀 커멘드가 같이 적용되어 타입 추론이 가능해진다.

  

```ts

/// <reference types="cypress" />

  

declare namespace Cypress {

interface Chainable {

/**

* 테스트 id를 가져옵니다.

* @example cy._('test-id')

*/

_(id: string): Chainable<JQuery<HTMLElement>>;

/**

* 테스트 id를 가져옵니다.(storybook 테스트 ID 방식을 따름)

* @example cy.__('data-testid')

*/

__(id: string): Chainable<JQuery<HTMLElement>>;

}

}

```

  

필자는 위 세가지를 유용하게 사용했고, 커스텀 커멘드를 사용하면 아래와 같이 간소화하여 작성할 수 있다.

  

```ts

it('No11. Password Box Placeholder Check', () => {

cy._('password')

.should('have.attr', 'placeholder')

.then((data) => expect(data).to.equal('비밀번호'));

cy._('email').clear();

});

it('No13. Password max length => 20 Check', () => {

cy._('password').type('1234');

cy._('password').then((data) => {

expect(String(data.val()).length).to.equal(20);

});

```

중복되는 작업을 cy로 직접 커스텀한 명령어에 접근하여 사용할 수 있게 된다.

  
  

# 웹 뷰 대응 viewport 기본 설정

  

웹 뷰에 대한 테스트도 동시에 진행이 가능한데. 따로 세팅해 두지 않으면 아래와 같이 사용해도 된다.

```ts

// test.cy.ts 테스트 파일

beforeEach(() => {

cy.viewport('macbook-16');

});

```

  

각 테스트의 `it`문이 돌 때마다 viewport를 설정해 두는 방식인데 이렇게 해도 문제는 되지 않으나 다소 중복되는 코드가 되어버린다. 이때 cypress는 테스트가 돌기 전 전체 프로세스에 공통으로 동작가능하게끔 환경설정을 해둘수 있다.

  

```ts

// cypress/support/e2e.ts

beforeEach(() => {

cy.viewport('macbook-16');

});

```

  

이렇게 설정해 두면 모든 테스트 파일에 viewport를 지정할 필요가 없다. 또한 웹 뷰나 디바이스별로 반응형 UI 테스트를 일괄적으로 세팅할 수 있으니 매우 유용한 설정이다.

![[Pasted image 20240325230646.png]]

  

## env

개발할 때 env를 가져와 환경설정 값을 가져와 작성하는데 cypress에서는 별도의 node.js 서버가 돌아가다 보니 기존 프로젝트의 .env를 가져와 사용하지 못하고 독자적인 cypress.env.json에서 선언해서 사용한다.

  

```json

// cypress.env.json

{

"NAME_TESTER": "테스터001",

"DORMANT_TESTER": "dormant001@naver.com",

"DORMANT_NAME": "휴면001",

"DORMANT_CI": "dormant-001-ci1",

"PHONE_TESTER": "01012345678",

}

```

  

이렇게 선언해 두면 아래와 같이 `Cypress.env()`에 설정해 둔 key를 넣으면 기존 개발/운영환경과 동일하게 env값을 사용할 수 있다.

  

```ts

cy._('email').click().type(Cypress.env('DORMANT_TESTER'));

cy._('password').click().type(Cypress.env('PASSWORD_TESTER'));

cy._('login-btn').click();

```

  
  

# 정리

  

강의 후기만 작성하기엔 주제에 비해 내용이 아쉬워 현업에서 유용하게 사용했던 방법들을 공유했다. 이 방법이 절대 정답이 아니고 여기저기 찾아보면서 사용하기 좋았던 기능들이니 참고정도만하길 바란다.

  

> 마지막으로 웹 프론트엔드 개발자에게 테스트란?

  

없을때는 모르는데 작성해 두면 두고두고 우려먹는 기능이다. 실제로 테스트를 작성했던 페이지들은 변경이 잦은 페이지들이 대부분이었고 그때마다 프로젝트를 실행시켜서 일일히 바뀌는 것을 확인하지 않고도 수정된 부분에 대한 테스트를 진행할 수 있었다.

  

단위 테스트보단 전체 플로우 테스트를 위해 e2e 테스트를 개인적으로 추천하는 바이고, 로직 자체가 자주 격변하는 프로젝트가 아니라면 바쁘더라도 e2e 테스트는 작성해 두면 엄청난 시간을 단축할 수 있으니 적극 추천하는 바이다.