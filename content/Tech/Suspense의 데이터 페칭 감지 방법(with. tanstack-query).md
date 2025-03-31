![[Suspense의 데이터 페칭 감지 방법0.png]]

## 개요

프론트엔드에서 비동기 처리 중 가장 많은 비중을 차지하는 것이 "데이터 페칭"이라고 생각한다. React의 Suspense는 선언적 비동기 처리 작업 중에서 많은 개발자들 활용하는 기능이지만 일반적인 방식의 데이터 페칭 방식으로는 Suspense 처리를 할 수 없다.

왜 그런 걸까? React의 Suspense의 개념과 기능에 대해서는 많이 알려져 있으니, 개념과과 기능은 따로 알아보고 지원하지 않은 이유와 Suspense의 구조/처리 방법에 대해 알아보고, tanstack-query나SWR와 같은 라이브러리에서는 어떤 식으로처리하여 선언적으로 사용할 수있는지해 알아보고자 한다.

## React 팀이 Suspense의 데이터 패칭을 지원하지 않은 이유

[Suspense](https://19.react.dev/reference/react/Suspense)는 이펙트 또는 이벤트 핸들러 내부에서 데이터를 가져오는 시점을 감지하지 못한다. 독립적인 프레임워크를 사용하지 않는 한 데이터 페칭을 위한 **Susepsne 지원**은 아직 되지 않는데 그 이유로는 React 팀 내부에선 아직 Suspense API는 불완전하다고 생각하는 것인지 데이터 페칭에 관한 API에 대한 내용은 문서에서도 유일한 방법은 "Suspense를 지원하는 프레임워크 사용"이라고만 명시되어 있다.

![[Suspense의 데이터 페칭 감지 방법1.png]]

## Suspense의 구조가 어떻길래?

Suspense는 자식 컴포넌트에서 Promise가 throw 된 것을 catch 하는 역할만 하여, fallback을 렌더링할지 자식 컴포넌트를 렌더링할지 대기(pending)상태에서 이행(fulfilled) 할지 거부(rejected) 할지 *상태를 관리하여 분기*해 주는 역할을 수행한다. 즉, Suspense를 작동하게 하기 위해선 **"자식 컴포넌트의 비동기 처리 중 부모 컴포넌트로 Promise 상태를 주고받는 상태가 가능한 컴포넌트"** 가 되어야 한다.

이제 컴포넌트가 비선언적 처리로 마운트 후 처리되는 방식과 선언적 처리로 Promise 상태를 주고받는 상태를 비교해 보자.

### 비선언적 처리

일반적으로 비선언적으로 처리하게 되면 아래와 같이 이펙트와 pending, error 상태를 선언하여 로딩을 켜고 끄는 방식으로 진행될 것이다.

```tsx
const Todo = ({ name }) => {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    setIsPending(true)
    setError(null)

    fetch(`...`)
      .then((res) => res.json())
      .then((json) => {
        setIsPending(false)
        setUser(json)
      })
      .catch((err) => setError(err))
  }, [name])

  if (isPending) return <SpinnerFallback />
  if (error !== null) return <ErrorFallback />

  return (
    <div>
      <h2>{name}</h2>
      <p>{user?.age}</p>
    </div>
  )
}
```

이렇게 작성해도 구현에는 아무 문제가 되지 않는다. 다만, React의 선언적 방식을 통한 비동기 처리와는 거리가 먼 명령형 프로그래밍 방식을 피하고자 비선언적 처리 방식을 개선하기 위해 Promise의 상태를 주고받을 수 있는 하나의 헬퍼 함수를 작성해서 선언적 처리 방식을 진행할 수 있다.

### 선언적 처리

우리는 아래와 같이 Suspense와 Errorboundary를 선언적 비동기 처리를 하기를 원할 것이다. 하지만 아래와 같이 진행하려면 일반적인 방식으로는 진행할 수 없다. 기본적으로 RSC의 서버 컴포넌트가 아닌 이상 아래 Todo 컴포넌트에선 직접적으로 데이터 페칭을 선언해서 사용하는 것이 불가능하다. 여기까지는 대부분 알고 있을 내용이라 생각된다. 

```tsx
const App = () => {
    return (
        <ErrorBoundary fallback={<ErrorFallback />}>
            <Suspense fallback={<SpinnerFallback />}>
                <Todo name="Julian" />
            </Supense>
        </ErrorBoundary>
    )
}

const Todo = ({ name }) => {
  const [user, isPending, error] = fetch(`...`)

  return (
    <div>
      <h2>{name}</h2>
      <p>{user?.age}</p>
    </div>
  );
};
```

### Promise 데이터 동기적 처리

위에 언급했듯이 "대기(pending)상태에서 이행(fulfilled) 할지 거부(rejected) 할지 *상태를 관리하여 분기*해 주는 역할"이 필요하다. 그렇다면 Promise 상태를 추적할 수 있는 함수를 만들어 Promise 객체에 프로퍼티를 추가하여 관리하는 코드를 작성했다.

```tsx
function readPromiseState(promise) {
  switch (promise.status) {
    case "pending":
      return { status: "pending" }
    case "fulfilled":
      return { status: "fulfilled", value: promise.value }
    case "rejected":
      return { status: "rejected", reason: promise.reason }
    default:
      promise.status = "pending"
      promise.then((value) => {
        promise.status = "fulfilled"
        promise.value = value
      })
      promise.catch((reason) => {
        promise.status = "rejected"
        promise.reason = reason
      })
      return readPromiseState(promise)
  }
}
```

위 코드를 예제로 실행해 보면 아래와 같은 결과를 얻을 수 있다.

```ts
> const promise1 = Promise.resolve("Hello World!")
> readPromiseState(promise1)
{ status: 'pending' } // 초기 호출시 대기 상태
> readPromiseState(promise1)
{ status: 'fulfilled', value: 'Hello World!' } // 대기가 끝난 후 이행 상태가 되며 resolve의 정보를 출력

> const promise2 = Promise.reject(new Error("Whoops!"))
> readPromiseState(promise2)
{ status: 'pending' } // 초기 호출시 대기 상태
> readPromiseState(promise2)
{ status: 'rejected', reason: [Error: Whoops!] } // 대기가 끝난 후 거부 상태가 되며 reject의 정보를 출력

> const promise3 = new Promise(res => setTimeout(res, 5000))
> readPromiseState(promise3)
{ status: 'pending' } // 5초 천 호출시 대기 상태
> readPromiseState(promise3)
{ status: 'pending' } // 5초 천 호출시 대기 상태
> readPromiseState(promise3)
{ status: 'pending' } // 5초 천 호출시 대기 상태
> readPromiseState(promise3)
{ status: 'fulfilled', value: undefined } // 5초 후 이행 상태 후 undefined 반환(반환 받을 정보가 없으니 undfined)
```

위의 내용을 이해하려면 Promise의 호출 순서와 어떤 구조로 수행되는지 이해해야 하는데, 위 예제는 간단해서 금방 이해할 수 있을 것이다.

좀 더 Promise의 동작 구조를 자세히 이해하고 싶다면 [Promise를 시각화하여 설명한 해당 아티클](https://velog.io/@sehyunny/js-visualized-promise-execution)을 읽어 보길 권장한다.

readPromiseState가 구성되었다면 이제 선언적 데이터 통신을 위한 useFetch를 작성해서 Todo 컴포넌트에 선언하여 사용하면 된다.

```tsx
const useFetch = (url) => {
  const promise = fetchUrl(url)
  const state = readPromiseState(promise)

  // 보류 중인 Promise throw
  const isPending = state.status === "pending"
  if (isPending) throw promise

  // 거부된 이유 throw
  const error = state.reason
  if (error) throw error

  const data = state.value

  return [data, isPending, error]
}

const Todo = ({ name }) => {
  const [user, isPending, error] = useFetch(`...`)

  return (
    <div>
      <h2>{name}</h2>
      <p>{user?.age}</p>
    </div>
  )
}
```

이제 우리가 자주 사용하던 tanstack-query나 SWR에서 사용되는 **useQuery**와 유사한 모습으로 구현되었다. 그러면 useQuery는 어떻게 작성되어 있고, 라이브러리를 사용하는 이유에 대해 알아보자.

## 왜 tanstack-query나 SWR과 같은 라이브러리를 사용할까?

지금부터는 선언적 데이터 페칭을 위해 라이브러리를 사용하면서까지 사용하는 이유와 라이브러리 내부 구조를 살펴볼 것이다.

### 라이브러리 사용 이유

먼저 왜 사용할까? 필자도 사실 위 코드처럼 명령형으로 처리하거나 promise 상태를 관리하는 함수를 작성해서 사용해 오고 있었다. 이를 위해 라이브러를 추가하여 불필요하게 서비스를 키우고 싶지 않았고 단순 로딩과 에러처리를 위해 러닝 커브를 높이고 싶지 않았기 때문이다. 

실제로 자바스크립트 문법으로도 충분히 라이브러리에서 제공되는 기능을 구현할 수도 있다. 하지만 프로젝트가 비대해지면서, 불필요한 코드의 보일러 플레이트가 계속해서 발생했다. 또한 내부적으로 Retry를 해야 하는 케이스, 중복적인 데이터 호출로 인해 캐싱이 필요한 사례 등으로 내가 직접 유지보수 하는 것보다 대형 커뮤니티로 이루어진 "잘 만든" 라이브러리를 채택하기로 한 것이다.

Suspense가 동작하는 구성과 원리를 파악했으니, 지금부터는 tanstack의 **useSuspenseQuery**를 기준으로, 어떻게 선언적으로 데이터 페칭되어 Suspense의 fallback이 렌더링할 수 있는 구조가 되는지 살펴보자. 내부 구조를 다루는 글은 보이지 않아서 직접 소스 코드를 추적하면서 알아 보았다.

### useSuspenseQuery

기본적으로 tanstack에서 제공되는 use???Query로 동작하는 구조는 아래 useSuspenseQuery 훅을 보면서도 알 수 있지만 useBaseQuery가 코어가 되어 실행된다. v4에선 아래와 같이 useQuery에 { _susepnse:true }_ 처리 하여 공통으로 사용했지만, v5에선 suspense용 훅이 분리되었다. 

```tsx
// useSuspenseQuery.ts
import { QueryObserver, skipToken } from "@tanstack/query-core"
import { useBaseQuery } from "./useBaseQuery"
import { defaultThrowOnError } from "./suspense"
import type { UseSuspenseQueryOptions, UseSuspenseQueryResult } from "./types"
import type { DefaultError, QueryClient, QueryKey } from "@tanstack/query-core"

export function useSuspenseQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  queryClient?: QueryClient,
): UseSuspenseQueryResult<TData, TError> {
  if (process.env.NODE_ENV !== "production") {
    if (options.queryFn === skipToken) {
      console.error("skipToken is not allowed for useSuspenseQuery")
    }
  }

  // Check!
  return useBaseQuery(
    {
      ...options,
      enabled: true,
      suspense: true, // Check!
      throwOnError: defaultThrowOnError,
      placeholderData: undefined,
    },
    QueryObserver,
    queryClient,
  ) as UseSuspenseQueryResult<TData, TError>
}
```

더 이상 특별한 코드가 없으니 useBaseQuery를 살펴보자. 

> 참조: [useSuspensequery.ts](https://github.dev/TanStack/query/blob/ffd404f6ca918b923cefbe57e795a986704c8c44/packages/react-query/src/useSuspenseQuery.ts#L23)

### useBaseQuery

```tsx
// useBaseQuery.ts
export function useBaseQuery<...>(
    options: UseBaseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
  Observer: typeof QueryObserver,
  queryClient?: QueryClient
){
  ...

  const client = useQueryClient(queryClient)
  ...
  const defaultedOptions = client.defaultQueryOptions(options)
  ...
  const [observer] = React.useState(
    () =>
      new Observer<TQueryFnData, TError, TData, TQueryData, TQueryKey>(
        client,
        defaultedOptions,
      ),
  )
  ...

  React.useEffect(() => {
   // defaultedOptions 변경으로 인한 listner에 업데이트를 알리지 않은 이유는
    // 이런 변경 사항은 이미 낙관적 결과에 반영되어야하기 때문이다.
    observer.setOptions(defaultedOptions, { listeners: false })
  }, [defaultedOptions, observer])

  // suspense 핸들링
  if (shouldSuspend(defaultedOptions, result)) {
   // 이펙트가 실행되지 않으므로 바로 위 이펙트와 동일한 작업을 수행한다.
    // 일시 중단하면 컴포넌트가 다시 마운트되지 않으므로 observer는 최신 상태로 되지 않는다.
    throw fetchOptimistic(defaultedOptions, observer, errorResetBoundary)
  }
  ...
}
```

위 코드는 suspense가 동작하는 데 필요한 코드만 발췌했다. 살펴보면 observer의 역할이 중요하다.

**observer**는 tanstack 내부에서 동작을 구독하는 역할을 한다. useEffect 구문을 살펴보면 defaultOptions와 observer를 의존하지만, 변경 사항에 있어서 listeners(쿼리를 사용하는 컴포넌트)에 알려주지 않는다. 설명에도 적혀있듯이 이미 낙관적 결과에 의해 반영되어야 하므로, 동일한 동작을 하여 렌더링을 시키지 않기 위한 목적으로 보인다.

아래에 suspense 핸들링 로직을 살펴보면 shouldSuspense에 defaultOptions와 result를 받아 상태를 throw를 하는 모습을 볼 수 있다. 하지만 해당 로직 또한 이펙트 로직과 마찬가지로 동일한 작업을 수행한다. 다만 shouldSuspend 처리를 통해 수행할지 말지 결정하는데, 아래 코드에서 살펴보자.

> 참조: [useBaseQuery.ts](https://github.dev/TanStack/query/blob/ffd404f6ca918b923cefbe57e795a986704c8c44/packages/react-query/src/useBaseQuery.ts#L95)

### suspense

```ts
// suspense.ts

export const shouldSuspend = (
  defaultedOptions:
    | DefaultedQueryObserverOptions<any, any, any, any, any>
    | undefined,
  result: QueryObserverResult<any, any>,
) => defaultedOptions?.suspense && result.isPending

export const fetchOptimistic = <...>(
  defaultedOptions: DefaultedQueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
  observer: QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  errorResetBoundary: QueryErrorResetBoundaryValue,
) =>
  observer.fetchOptimistic(defaultedOptions).catch(() => {
    errorResetBoundary.clearReset()
  })
```

shouldSuspend는 defaultOptions와 observer의 결괏값을 받는다. 이때 defaultOptions.suspense가 true이면서 result.isPending이 true라면, observer의 상태가 suspense를 돌도록 "대기(pending)" 상태가 되어 있을 때 해당 함수를 true로 반환한다.

그렇다면 useBasequery에서 if 문이 동작하는 조건을 해당 useQuery를 선언한 컴포넌트가 pending 상태 시 상태를 변경하지 않고 React의 Suspense에서 fallback 계속 유지하는 모습을 기대할 수 있을 것이다.

다음 조건이 만족하게 되면 fetchOptimistic을 throw 하게 되는데, 이때 return 되는 정보는 observer.fetchOptimistic을 현재 상태의 defaultOptions를 받아 처리하는 것으로 보아 낙관적 결과를 위해 현재 상태(pending) 그대로 유지하려 하는 것으로 알 수 있다.

> 참조: [suspense.ts](https://github.dev/TanStack/query/blob/ffd404f6ca918b923cefbe57e795a986704c8c44/packages/react-query/src/suspense.ts#L37)

### queryObserver

지금까지의 흐름으로 보아 컴포넌트의 promise의 상태를 확인하고 처리하는 곳은 observer라는 것을 알 수 있다. 해당 로직에서는 확인해야 할 코드가 많아서 필요한 코드만 발췌했으나, 직접 소스 코드를 따라가는 것이 좋다.

여기서 체크할 부분은 파라미터로 가져온 query의 state 값, fetchState를 통해 현재 데이터의 상태를 업데이트하는 newState 정보를 통해  status의 pending, success, error 상태값을 다루는 것을 체크해보면 된다.

pending 상태는 query.ts에서 확인할 수 있고, success와 error를 살펴보면 된다. 발췌한 코드가 많으니 주석을 기준으로 살펴보자.

```ts
// queryObserver.ts

export class QueryObserver<...> {
	...
    constructor(
        client: QueryClient,
        public options: QueryObserverOptions<...>,
    ) {
        super()
        this.#client = client
        this.#selectError = null
    }
    ...
    const { state } = query
    let newState = { ...state }
    let { error, errorUpdatedAt, status } = newState
    ...

    // 필요한경우 결과를 페칭하는 상태를 낙관적 set을 취한다.
    if (options._optimisticResults) {
      const mounted = this.hasListeners()

      const fetchOnMount = !mounted && shouldFetchOnMount(query, options)

      const fetchOptionally =
        mounted && shouldFetchOptionally(query, prevQuery, options, prevOptions)

      if (fetchOnMount || fetchOptionally) {
        newState = {
          ...newState,
          // fetchState를 통해 현재 fetch 상태를 관리
          // status의 default 상태는 pending이다.
          ...fetchState(state.data, query.options),
        }
      }
      if (options._optimisticResults === 'isRestoring') {
        newState.fetchStatus = 'idle'
      }
    }
    ...

    fetchOptimistic(
        options: QueryObserverOptions<
          TQueryFnData,
          TError,
          TData,
          TQueryData,
          TQueryKey
        >,
    ): Promise<QueryObserverResult<TData, TError>> {
        const defaultedOptions = this.#client.defaultQueryOptions(options)

        const query = this.#client
          .getQueryCache()
          .build(this.#client, defaultedOptions)
        query.isFetchingOptimistic = true

        return query.fetch().then(() => this.createResult(query, defaultedOptions))
    }

    ...
    // placeholder 데이터가 필요한다면
    // 현재 status가 pending 이면
    if (
      options.placeholderData !== undefined &&
      data === undefined &&
      status === 'pending'
    ) {
      let placeholderData

      if (
        prevResult?.isPlaceholderData &&
        options.placeholderData === prevResultOptions?.placeholderData
      ) {
        placeholderData = prevResult.data
      } else {
        placeholderData =
          typeof options.placeholderData === 'function'
            ? (
                options.placeholderData as unknown as PlaceholderDataFunction<TQueryData>
              )(
                this.#lastQueryWithDefinedData?.state.data,
                this.#lastQueryWithDefinedData as any,
              )
            : options.placeholderData
        if (options.select && placeholderData !== undefined) {
        	// observer의 options에 options.select 실행 여부를 throw한다.
          try {
            placeholderData = options.select(placeholderData)
            this.#selectError = null
          } catch (selectError) {
            this.#selectError = selectError as TError
          }
        }
      }

	  // data를 받고 placeholderData가 있다면 status를 success로 변경하고 data 값 적용
      if (placeholderData !== undefined) {
        status = 'success'
        data = replaceData(
          prevResult?.data,
          placeholderData as unknown,
          options,
        ) as TData
        isPlaceholderData = true
      }
    }

 	// 에러 상태라면 status를 error로 변경
    if (this.#selectError) {
      error = this.#selectError as any
      data = this.#selectResult
      errorUpdatedAt = Date.now()
      status = 'error'
    }

    // newState 상태와, status를 상태값에 대한 변수 선언
    const isFetching = newState.fetchStatus === 'fetching'
    const isPending = status === 'pending'
    const isError = status === 'error'
    const isLoading = isPending && isFetching
    const hasData = data !== undefined

    const result: QueryObserverBaseResult<TData, TError> = {
      ...
      status,
      fetchStatus: newState.fetchStatus,
      isPending,
      isError,
      isLoading,
      isFetching,
      ...
    }

    return result as QueryObserverResult<TData, TError>
  }
}
```

pending 상태에서 placeHolder 데이터 여부와 data 처리를 _options.select를 실행하여 observer에 실행 여부를 throw 하여 '#selectError'의 데이터를 null 또는 에러 데이터를 할당_ 한다. 최종적으로 status 값을 success 처리할지 error 처리를 할지 결정하여 결과를 반환시킨다.

> 참조: [queryObserver.ts](https://github.dev/TanStack/query/blob/ffd404f6ca918b923cefbe57e795a986704c8c44/packages/query-core/src/queryObserver.ts#L41)

### query

```ts
// query.ts
export class Query<...>{
	...
    fetch(
        options?: QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
        fetchOptions?: FetchOptions<TQueryFnData>,
    ): Promise<TData> { ... }
    ...
}

export function fetchState<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
>(
  data: TData | undefined,
  options: QueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: canFetch(options.networkMode) ? 'fetching' : 'paused',
    ...(data === undefined &&
      ({
        error: null,
        status: 'pending', // 초기값 pending
      } as const)),
  } as const
}
```

fetchState를 통해 상태 값을 초기화하고 업데이트하는 함수를 통해 현재 상태를 관리한다. 하고 Query 인스턴스를 통해 내부 메서드 중 fetch 메서드를 통해 Promise 처리하는 것을 알 수 있다.

참조: [query.ts](https://github.dev/TanStack/query/blob/ffd404f6ca918b923cefbe57e795a986704c8c44/packages/query-core/src/query.ts#L621)

## 정리

Promise를 이용해 Suspense를 다루는 방법과 tanstack을 통해 Promise와 같은 로직을 어떤 식으로 구성했는지 알아보았다. tanstack이 워낙 함수를 잘게 분리해 놓아서 추적하는데 쉽지는 않았지만, useBaseQuery의 코어 로직을 살펴보면서 낙관적 결과에 따라 observer를 통해 현재 Promise의 상태를 구독하고 처리하는 것을 알 수 있었다.

실제 메인 로직은 query.ts와 queryObserver.ts에 모두 작성되어 있지만, 코드가 너무 방대해 현재 글에 필요한 부분만 따로 발췌했으니 궁금한 분들은 참조한 코드를 따라가 직접 따라가 보는 것을 추천한다.

이번 글은 Suspense가 메인이 되기보단 이를 실행하기 위해 데이터 페칭을 통해 내부 메커니즘이 어떤 식으로 구성하고작성해야 하는지를를 설명하게 되었다. 실제로 Suspense의 사용법이나 내부 동작에 관한 글은 많이 있다. 하지만 tanstack과 같은 라이브러리에서도 과연 동일하게 작성될까? 라는 의문을 시작으로 딥 다이브했고, 메커니즘은 같을 지언정 전역 서버 상태를 관리함으로써 observer를 통해 promise를 처리하는 부분에서 인상 깊다.
