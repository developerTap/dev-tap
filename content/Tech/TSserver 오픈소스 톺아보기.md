---
lastmod: 2024-01-26
---

![[TSserver 오픈소스 톺아보기1.png]]

## **개요**

지난 번 [오픈 소스 스터디](https://chip-bream-9d5.notion.site/from-1-1c6225d0b7094739a796e1f628044ae5?p=657224dc0c254706ace22b37a352e7a6&pm=c)를 위해 [tsserver](<https://github.com/microsoft/TypeScript/wiki/Standalone-Server-(tsserver)>)에 관해 조사한 적이 있었다. 당시에는 조사에만 그치고 내부 구조에 대해 파편화된 정보로만 조사했었다. 그런데 타입스크립트를 사용하면서 tsserver의 내부 구조에 관한 글을 본 적이 없는 것 같아 이번 기회에 tsserver에 대해 톺아보기에 시간을 가져가고자 한다. 

자 이제 숨 쉬듯 쓰던 TS(TypeScript)가 어떻게 IDE에서 그렇게나 많은 타입을 검사하고, 변환하고, 유추하는데 사용자가 큰 불편함 없이 사용할 수 있었던 원인을 알아보자.

이 글은 단순히 tsserver의 이론적인 정보를 전달하는 글이 아니다. 이론과 비즈니스 로직을 파악하면서 순차적으로 코드 중심적으로 작성하고자 한다. 

#### \*_전달하고자하는 내용_

1. tsserver가 IDE에 어떤 원리로 동작하는지?
2. 왜 JSON 프로토콜을 통한 통신방식을 선택했는지?
3. tsserver가 IDE에서 어떻게 Type Checking이 되는지?
4. 실제 비즈니스 로직이 어떻게 흘러가는지?

## **tsserver**

원리를 알려면 일단 tsserver가 어떤 기술을 사용하고 있는지 알아보자.

> /\* 공식문서 발췌 \*/
> TypeScript의 독립형 서버(일명 **tsserver**)는 TypeScript 컴파일러와 언어 서비스를 캡슐화하고 JSON 프로토콜을 통해 노출하는 노드 실행 파일입니다. tsserver 편집기 및 IDE 지원에 매우 적합합니다.

아래 IDE에서 사용이 가능하다. 다른 IDE에서도 [LSP](https://en.wikipedia.org/wiki/Language_Server_Protocol)를 따르기 때문에 tsserver를 사용하는 것에 문제는 없다.

![[TSserver 오픈소스 톺아보기2.png]]

#### **LSP(Language Server Protocol)**

>  LSP는 IDE와 프로그래밍 언어별 기능을 제공하는 서버 사이에 사용하는 개방형 **[JSON-RPC](https://en.wikipedia.org/wiki/JSON-RPC)** 기반 프로토콜이다. 서로 다른 개발 도구 사이에 **표준화된 통신 프로토콜**로, tsserver를 포함한 다양한 언어 서버와 개발 도구 사이의 상호 기능을 가능하게 한다.

LSP는 지속적으로 사양이 업데이트 되는데, 이는 TS 업데이트에도 관련이 있다. 

예를들면 [Workspace commands](https://github.com/typescript-language-server/typescript-language-server/blob/master/README.md#go-to-source-definition)에서 정의된 기능 중 **typescript.goToSourceDefinition**기능을 수행하기 위해선 TS 4.7버전부터 지원이 된다. 이를 보면 알 수 있듯이 TS에선 단순히 [ECMAScript의 스펙](https://www.proposals.es/specifications)만의 기준으로 TS를 업데이트하는 것이 아닌 [LSP 버전 유형](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#workspace_executeCommand)을 동시에 참조하면서 구성되어 있다는 것을 알 수 있었다.

이 덕분에 최신 IDE에선 개발자에게 코드 완성 , 리팩토링 , 기호 정의 탐색 , 구문 강조 표시, 오류 및 경고 표시와 같은 기능을 제공한다. \[[참고](https://zetawiki.com/wiki/%EC%96%B8%EC%96%B4_%EC%84%9C%EB%B2%84_%ED%94%84%EB%A1%9C%ED%86%A0%EC%BD%9C)\]

#### **JSON 프로토콜**

[JSON](https://www.json.org/json-ko.html) 프로토콜은 TS와 개발 환경 간의 통신을 위한 프로토콜이다. TS에서 요청과 응답은 모두 JSON 객체로 표현되고 command와 seq 필드를 가지고 있다. **command** 필드는 요청의 **"종류"**, **seq** 필드는 요청의 **"ID"**를 나타낸다. 

#### **프로토콜 정의 사용 예시** 

어떤 의미인지 아래 예시를 보면서 이해를 해보자. (참고: [tsserver-example](https://github.com/mmorearty/tsserver-example))

아래는 TS에서 사용되는 **quickInfo**기능에 대한 JSON 정보이다.

```json
{
  "seq": 0, // 요청 ID
  "type": "response",
  "command": "quickinfo", // 요청 종류
  "request_seq": 1,
  "success": true,
  "body": {...}
}
```

이 요청은 코드에 마우스 호버를 했을시 간단하게 그 코드에 대한 정보를 알려주는 팝오버가 뜨는데 이 기능을 띄울 수 있게 하는 프로토콜이다.

![[TSserver 오픈소스 톺아보기3.png]]

다음은 TS에서 사용되는 **getApplicableRefactors**기능에 대한 JSON 정보이다.

```json
{
  "seq": 1, // 요청 ID
  "type": "response",
  "command": "getApplicableRefactors", // 요청 종류
  "request_seq": 2,
  "success": true,
  "body": [...]
}
```

이 요청은 변경 사항이 일어났을 때, 코드 왼쪽에 전구 모양이 발생하는데 "수정 사항 표시"를 해주는 기능이다.

![[TSserver 오픈소스 톺아보기4.png]]

이처럼 우리가 에디터에서 발생하는 이벤트 중 TS와 관련된 이벤트는 내부적으로 tsserver가 돌면서 상황에 맞는 JSON 프로토콜을 참조하면서 사용자에게 보이게 된다. 그렇다면 JSON 프로토콜을 기능별로 하드코딩 하여 관리하는 이유는 무엇일까?

#### **안전성, 성능 그리고 호환성**

- **안정성**  
  하드 코딩된 프로토콜은 API나 데이터 형식에 예기치 않게 변경되는 것을 방지한다. 특히나 다양한 클라이언트와 통신해야 하는 tsserver 특성상 서버 환경이 중요하다. 그 때문에 서버와 클라이언트 간의 통신 규약이 명확하게 정의되어 있으면, 이를 준수하는 모든 클라이언트가 안정적으로 서버와 통신할 수 있게 된다. 우리가 다양한 OS 환경에서도 VSCode를 사용했을 때, 동일한 타입 시스템을 사용할 수 있는 것도 이와 같은 이유이다.
- **성능**  
  JSON은 사람이 읽고 작성하기 쉬운 경량 데이터 방식이다. 그 때문에 통신에 필요한 오버헤드를 최소화할 수 있고, JSON 파싱 및 직렬화는 대부분은 프로그래밍 언어에서 기본적으로 지원되기 때문에 이를 이용하면 추가적인 라이브러리나 의존성 없이 빠르게 처리가 가능하다.
- **호환성**  
  JSON은 Javascript를 기반으로 하므로, Javascript를 사용하는 모든 환경에서 사용이 가능하다. 또한 TS와 관련된 도구나 서비스에서 JSON 프로토콜 사용이 가능한데 tsserver가 다양한 개발 환경과 통신 할 수 있게 가능한 것도 이 때문이다.

tsserver에서 사용되는 통신규약과 JSON 프로토콜의 정의와 사용 방식, 그리고 그 이점에 관해 설명했으니, 실제 에디터에서 어떤 흐름으로 동작하는지 알아보자.

## **동작순서**

![[TSserver 오픈소스 톺아보기5.png]]

1. 에디터에서 **ts,tsx** 파일을 열면 편집기가 해당 파일에 대한 프로젝트를 초기화하도록 tsserver에 요청한다.
2. [tsconfig.json](https://www.typescriptlang.org/ko/docs/handbook/tsconfig-json.html)파일에서 프로젝트 구성을 읽고 해당 프로젝트에 tyescript를 설정한다.
3. 편집기 입력 시 VScode는 코드를 완성, 코드 탐색 및 심볼 검색과 같은 기능을 위해 tsserver에 실시간 요청한다.
4. 요청된 정보가 포함된 응답을 편집기로 전송한다.
5. 파일 저장 시 tsserver가 코드를 확인하고 오류나 경고를 편집기에 보고한다.

우리가 사용하고 있던 타입스크립트는 이런 원리와 방식으로 동작하고 있었다. 그렇다면 실제 비즈니스 로직은 어떻게 이루어져 있을까? 이왕 tsserver를 톺아보기로 했으니 직접 코드를 뜯어보자.

## **서버 실행 순서**

typescript의 Github 오픈 소스는 생각 이상으로 디렉토리리 구조가 보기 쉽게 잡혀있고, 실제로 contributor가 많은 만큼 체계적인 폴더 구조와 코드가 짜여있어 코드 파악하기가 쉽다.

차근차근 알아보자. 시작은 **src/tsserver/server.ts**부터 시작한다.

1. **initializeNodeSystem** 를 통해 **server.ts**에서 start를 실행한다. ([링크](<https://github.dev/microsoft/TypeScript/blob/6e4aa901f25ffa90096dc0cc1d0dd13243dec3e6/src/tsserver/server.ts#L70-L71)>))

```ts
function start({ args, logger, cancellationToken, serverMode, unknownServerMode, startSession: startServer }: StartInput, platform: string) {
  ...
    startServer({
        globalPlugins: findArgumentStringArray("--globalPlugins"),
        pluginProbeLocations: findArgumentStringArray("--pluginProbeLocations"),
        allowLocalPluginLoads: hasArgument("--allowLocalPluginLoads"),
        useSingleInferredProject: hasArgument("--useSingleInferredProject"),
        useInferredProjectPerProjectRoot: hasArgument("--useInferredProjectPerProjectRoot"),
        suppressDiagnosticEvents: hasArgument("--suppressDiagnosticEvents"),
        noGetErrOnBackgroundUpdate: hasArgument("--noGetErrOnBackgroundUpdate"),
        serverMode
    },
    logger,
    cancellationToken
   );
}

// ✅ 서버 실행
start(initializeNodeSystem(), require("os").platform());
```

2. **nodeServer.ts**에 구성된 함수 **initializeNodeSystem**에선 실제 서버를 켜고 끄는 작업이 진행된다. 내부에선 실제 파일시스템을 통해 실시간으로 코드 작성 중 필요한 정보를 알려줄 수 있도록 JSON 프로토콜과 통신하는 로직이 들어있으며, 실시간으로 필요한 로그를 세부적으로 찍고 관리되고 있다. ([링크](<https://github.dev/microsoft/TypeScript/blob/6e4aa901f25ffa90096dc0cc1d0dd13243dec3e6/src/tsserver/nodeServer.ts#L168-L169)>))

```ts
/** @internal */
export function initializeNodeSystem(): StartInput {
    const sys = Debug.checkDefined(ts.sys) as ServerHost;
    const childProcess: {
        execFileSync(file: string, args: string[], options: { stdio: "ignore", env: MapLike<string> }): string | Buffer;
    } = require("child_process");
    ...
}

// ✅ IOSession을 통해 소켓 통신을 구성하고 있다. 자세한 코드는 링크 참조.
class IOSession extends Session { ... }

// ✅ 서버를 키고 끄는 작업은 initializeNodeSystem에서 수행된다.
listen() {
      rl.on("line", (input: string) => {
          const message = input.trim();

          // ✅ JSON 프로토콜과 통신하기 위해 메세지를 주고 받을 수 있는 함수이다.
          this.onMessage(message);
      });

      rl.on("close", () => {
          this.exit();
      });
  }
}
```

3. **onMessage**를 확인해 보면 아까 언급했던 **seq**와 **command**라는 용어가 나온다. 그렇다는 것은 여기서 실제 JSON 프로토콜을 통신하려는 함수를 확인할 수 있을 것이다.  ([링크](<https://github.dev/microsoft/TypeScript/blob/6e4aa901f25ffa90096dc0cc1d0dd13243dec3e6/src/server/session.ts#L3553-L3554)>))

```tsx
public onMessage(message: TMessage) {
	...
	// ✅ request 파싱 함수
	request = this.parseMessage(message);
	relevantFile = request.arguments && (request as protocol.FileRequest).arguments.file ? (request as protocol.FileRequest).arguments : undefined;

	tracing?.instant(tracing.Phase.Session, "request", { seq: request.seq, command: request.command });
	perfLogger?.logStartCommand("" + request.command, this.toStringMessage(message).substring(0, 100));

	tracing?.push(tracing.Phase.Session, "executeCommand", { seq: request.seq, command: request.command }, /*separateBeginAndEnd*/ true);

	// ✅ request 실행 후 반환 받는 함수
	const { response, responseRequired } = this.executeCommand(request);
	tracing?.pop();
	...
}
```

4. **parseMessage**는 요청 메시지를 JSON 파싱하여 문자열 형태로 반환된다.

```tsx
protected parseMessage(message: TMessage): protocol.Request {
    return JSON.parse(message as any as string) as protocol.Request;
}
```

5. 반환된 request 값은 **executeCommand**에서 **handler** 함수를 통해 **request.seq** 값을 요청하여 response를 받아오는 형태이다. ([링크](<https://github.dev/microsoft/TypeScript/blob/release-5.1/src/server/session.ts#L3539-L3540)>))

```tsx
public executeCommand(request: protocol.Request): HandlerResponse {
	// ✅ handler는 프로토콜 커맨드를 찾는 주요 함수이다.
    const handler = this.handlers.get(request.command);
    if (handler) {
    	// ✅ JSON에 명시된 seq를 찾는 로직이다.
        const response = 🔴this.executeWithRequestId(request.seq, () => handler(request));
        this.projectService.enableRequestedPlugins();
        return response;
    }
    else {
        this.logger.msg(`Unrecognized JSON command:${stringifyIndented(request)}`, Msg.Err);
        this.doOutput(/*info*/ undefined, protocol.CommandTypes.Unknown, request.seq, /*success*/ false, `Unrecognized JSON command: ${request.command}`);
        return { responseRequired: false };
    }
}

// ✅ 요청된 requestId를 현재 요청 requestId로 셋팅한뒤 handler 함수로 request를 콜백 호출한다.
🔴public executeWithRequestId<T>(requestId: number, f: () => T) {
    try {
        🟣this.setCurrentRequest(requestId);
        return f();
    }
    finally {
        🟡this.resetCurrentRequest(requestId);
    }
}

// ✅ 현재 요청 값을 저장하고 추후 취소할 토큰 함수에도 같이 저장한다.
🟣private setCurrentRequest(requestId: number): void {
    Debug.assert(this.currentRequestId === undefined);
    this.currentRequestId = requestId;
    this.cancellationToken.setRequest(requestId);
}

// ✅ 위 작업을 초기화한다.
🟡private resetCurrentRequest(requestId: number): void {
    Debug.assert(this.currentRequestId === requestId);
    this.currentRequestId = undefined!; // TODO: GH#18217
    this.cancellationToken.resetRequest(requestId);
}
```

6. **handler** 함수는 하드코딩으로 정의된 JSON의 command 정보를 가져오게 된다. 여기서 에디터에서 보이게되는 가장 핵심 비즈니스 로직들이 모여있는 곳이다. ([링크](<https://github.dev/microsoft/TypeScript/blob/release-5.1/src/server/session.ts#L3110-L3111)>))

```tsx
private handlers = new Map(Object.entries<(request: any) => HandlerResponse>({ // TODO(jakebailey): correctly type the handlers
    ...
    // ✅ 예시로 보았던 QuickInfo 기능
    [protocol.CommandTypes.Quickinfo]: (request: protocol.QuickInfoRequest) => {
        return this.requiredResponse(this.getQuickInfoWorker(request.arguments, /*simplifiedResult*/ true));
    },
	[protocol.CommandTypes.GetApplicableRefactors]: (request: protocol.GetApplicableRefactorsRequest) => {
        return this.requiredResponse(this.getApplicableRefactors(request.arguments));
    },
    // ✅ TODO: 작성시 노란색 하이라이팅 되는 기능의 로직을 볼 수 있다.
	[protocol.CommandTypes.TodoComments]: (request: protocol.TodoCommentRequest) => {
        return this.requiredResponse(this.getTodoComments(request.arguments));
    },
	...
    },
}
```

7. **getPosition, getPositionInFile, extractPositionOrRange**는 에디터에서 어떤 파일의 어느 라인 또는 어디서부터 어디까지 영역을 체크해주는 함수들이다. 그런데 코드를 보면 알 수 있듯이. MS 개발자와 contributor들 또한 중복된 함수 이름을 정의해서 새로운 로직을 짠다던가, 다른 로직을 구성하는데 동일한 함수를 명명하는 모습을 알 수 있다. ([링크](<https://github.dev/microsoft/TypeScript/blob/release-5.1/src/server/session.ts#L2038-L2039)>))

```tsx
private getPositionInFile(args: protocol.Location & { position?: number }, file: NormalizedPath): number {
    const scriptInfo = this.projectService.getScriptInfoForNormalizedPath(file)!;
    return this.getPosition(args, scriptInfo);
}

// ✅
private getPosition(args: protocol.Location & { position?: number }, scriptInfo: ScriptInfo): number {
    return args.position !== undefined ? args.position : scriptInfo.lineOffsetToPosition(args.line, args.offset);
}

private getQuickInfoWorker(args: protocol.FileLocationRequestArgs, simplifiedResult: boolean): protocol.QuickInfoResponseBody | QuickInfo | undefined {
	...
    // ✅
    const quickInfo = project.getLanguageService().getQuickInfoAtPosition(file, this.getPosition(args, scriptInfo));
	...
}

private getApplicableRefactors(args: protocol.GetApplicableRefactorsRequestArgs): protocol.ApplicableRefactorInfo[] {
	...
    return project.getLanguageService().getApplicableRefactors(file, this.extractPositionOrRange(args, scriptInfo), this.getPreferences(file), args.triggerReason, args.kind, args.includeInteractiveActions);
}

private extractPositionOrRange(args: protocol.FileLocationOrRangeRequestArgs, scriptInfo: ScriptInfo): number | TextRange {
    let position: number | undefined;
    let textRange: TextRange | undefined;
    if (this.isLocation(args)) {
	   // ✅
       position = getPosition(args);
    }
    else {
        textRange = this.getRange(args, scriptInfo);
    }
    return Debug.checkDefined(position === undefined ? textRange : position);

    function getPosition(loc: protocol.FileLocationRequestArgs) {
        return loc.position !== undefined ? loc.position : scriptInfo.lineOffsetToPosition(loc.line, loc.offset);
    }
}
```

8. **Position**을 모든 커맨드마다 지정하는 모습을 확인 할 수 있다.

![[TSserver 오픈소스 톺아보기6.png]]

## **마치며**

우리가 타입스크립트를 쓰면서 당연하게 생각해 왔던 기능이 에디터 뒤쪽에서 이렇게나 많은 일들이 일어나고 있다는 것을 알게 되었다. 무엇보다 순차적으로 자료를 조사하면서 새로운 방식에 대해 알아가는 과정이 꽤 재미있었다.

지금까지 tsserver를 톺아보면서 에디터 사용 시 언어별로 구분되고, 언어마다 제공되던 기능들이 JSON 프로토콜을 따른다는 것 또한 알게 되었는데, 의외였던 점은 JSON을 하드코딩으로 관리되어 있었다는 점이었다. 아마 대부분의 에디터 플러그인이 이런 방식으로 취하고 있을 것으로 예상된다.

tsserver의 기능에 대한 빠른 탐색과 서버 부하를 최소화하기 위한 노력이 비즈니스 로직에 고스란히 녹아있는 것을 보면서 정말 대단하다는 느낌이 들었다.
