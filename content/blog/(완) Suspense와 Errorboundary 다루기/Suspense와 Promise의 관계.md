---

---
---
참고자료

- [(번역) 자바스크립트 시각화하기 : 프로미스 실행](https://velog.io/@sehyunny/js-visualized-promise-execution)
- [[React] React.Suspense가 프라미스를 감지하는 법 (feat. lazy)](https://velog.io/@gyutato/React-Suspense%EA%B0%80-%ED%94%84%EB%9D%BC%EB%AF%B8%EC%8A%A4%EB%A5%BC-%EA%B0%90%EC%A7%80%ED%95%98%EB%8A%94-%EB%B2%95)
- [React 18 - Suspense 분석하기](https://blue-tang.tistory.com/98)
- [[JS][RxJS] 3가지 방식으로 Polling 구현하기: JS, React-Query, RxJS (feat. abortController)](https://velog.io/@gyutato/3%EA%B0%80%EC%A7%80-%EB%B0%A9%EC%8B%9D%EC%9C%BC%EB%A1%9C-Polling-%EA%B5%AC%ED%98%84%ED%95%98%EA%B8%B0-JS-React-Query-RxJS-feat.-abortController)
- [react-promise-suspense](https://www.npmjs.com/package/react-promise-suspense)
- [Javascript Promise Basic](https://ui.toast.com/weekly-pick/ko_20150904)
- [⚛ Next.js(SSR)에서의 Suspense, ErrorBoundary](https://sangmin802.github.io/Study/Framework/next.js%20async/#%EB%AC%B8%EC%A0%9C%EC%9D%98-%EC%8B%9C%EC%9E%91-suspense)
---

# Promise 내부 동작 방식

-  [프로미스 객체](https://tc39.es/ecma262/#sec-properties-of-promise-instances) 생성시 내부 슬롯
	- `[[PromiseState]]`
	- `[[PromiseResult]]`
	- `[[PromiseIsHandled]]`
	- `[[PromiseFulfillReactions]]`
	- `[[PromiseRejectReactions]]`
- [Promise Capability 레코드](https://tc39.es/ecma262/#sec-promisecapability-records) 생성
	- 프로미스를 "캡슐화"하고 프로미스를 _이행(resolve)_ 하거나 _거부(reject)_ 하기 위한 부가 기능
	- 최종적으로 프로미스의 `[[PromiseState]]`와 `[[PromiseResult]]`를 제어하고 비동기 작업을 시작하는 함수



# React 18 - Suspense

## 장점 및 한계

이 방식을 통해서 데이터 로딩 및 에러에 관련된 로직과 UI 로직을 분리할 수 있다. 이로 인해 컴포넌트는 더 간결해지고, 명확한 로직을 가질 수 있다.

또한 에러와 서스펜스의 바운더리가 명확하기 때문에 일관된 에러 및 로딩 처리를 할 수 있다는 장점도 있다.

**하지만 공식 문서에서도 언급하고 있듯이, `Suspense` 내에서 직접적으로 `Promise`를 던지는 방식은 production에서는 조심할 필요가 있다.**

대신에 `ReactQuery` 등 `Suspense`를 지원하는 라이브러리가 등장했기 때문에 그런 걸 사용하는 것이 더 좋다.