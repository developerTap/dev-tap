한때 우리는 웹용 VS Code([](https://vscode.dev/)[https://vscode.dev](https://vscode.dev))를 브라우저에서는 모든 편집 / 컴파일 / 디버그 주기를 지원하는 것을 목표로 하고 있습니다. 브라우저에서 자바스크립트 실행 엔진이 제공된 후로 자바스크립트와 타입스크립트와 같은 언어는 비교적 쉽게 적용할 수 있었습니다. 하지만 코드를 실행(디버깅 같은)할 수 있게 된 후로 다른 언어에서는 더욱 어려웠습니다. 예를 들어, 브라우저에서 Python 코드를 실행하려면 Python 인터프리터를 실행할 수 있는 실행 엔진이 필요합니다. 이런 언어 런타임은 보통 C/C++로 작성됩니다.

[웹 어셈블리(WebAssembly)](https://webassembly.org/)는 가상 머신의 바이너리 명령 형식으로 구성됩니다. 오늘날 웹 어셈블리 가상 머신은 최신 브라우저와 C/C++를 웹 어셈블리 코드로 컴파일하는 툴 체인(Tool Chain)이 함께 제공됩니다.

오늘날 WebAssemblies를 사용하기 위해 C/C++로 작성된 Python 인터프리터를 가져왔습니다. 그리고 웹 어셈블리를 컴파일하여 웹용 VS Code를 실행하기로 했습니다. 운 좋게도, 이미 Python 팀은 [CPython을 WASM](https://github.com/brettcannon/cpython-wasi-build/releases)으로 컴파일하는 작업을 시작했고, 우리는 기꺼이 그들의 노력에 편승했습니다. 결과물로 아래 짧은 영상을 확인할 수 있습니다.

![https://code.visualstudio.com/assets/blogs/2023/06/05/run-python-file.gif](https://code.visualstudio.com/assets/blogs/2023/06/05/run-python-file.gif)

VS Code 데스크톱에서 실제 Python 코드를 실행하는 것과 다르지 않은데 이게 왜 멋진 일 일까요?

- Python 코드(`app.py`와 `hello.py`)는 호스팅된 [GitHub repository](https://github.com/dbaeumer/wasm-wasi-sample)에 직접 접근하여 읽습니다.
- 여러 샘플 코드에서 `app.py`는 `hello.py`에 의존되어 있습니다.
- 출력물은 VS Code 터미널에 잘 보입니다.
- Python REPL을 실행하고 전부 사용할 수 있습니다.
- 물론 웹에서도 실행됩니다.

또한 웹 어셈블리(WASM) 코드로 컴파일된 Python 인터프리터는 웹용 VS Code에서 실행하기 위해 수정하지 않아도 됩니다. 그 비트는 CPyhton팀이 만든 것과 동일합니다.

## [어떻게 동작하나요?](https://code.visualstudio.com/blogs/2023/06/05/vscode-wasm-wasi#_how-does-it-work)

웹 어셈블리 가상머신은 SDK를 제공하지 않습니다([Java](https://www.java.com/)나 [.NET](https://dotnet.microsoft.com/)). 별도의 설치 없이 웹 어셈블리 코드는 콘솔에 입력하거나 파일 내용을 읽을 수 없습니다. 웹 어셈블리 사양을 정의는 어떤 웹 어셈블리 코드가 가상 머신을 실행하는 호스트에서 기능을 호출할 수 있는지를 봅니다. 웹용 VS Code의 경우 호스트는 브라우저입니다. 가상머신은 브라우저에서 실행되는 자바스크립트 기능을 사용할 수 있습니다.

Python 팀에서 제공하는 두 가지 형태의 인터프리터 웹 어셈블리 바이너리로 [emscripten](https://emscripten.org/index.html)과 [WASI SDK](https://github.com/WebAssembly/wasi-sdk)가 컴파일됩니다. 둘 다 웹 어셈블리 코드를 생성하지만, 호스트 구현으로 제공하는 자바스크립트 기능 서로 다른 특징을 가지고 있습니다.

- **emscripten** - 웹 플랫폼과 [Node.js](https://nodejs.org/)에 중점을 두고 있습니다. WASM 코드를 생성하는 것 외에도 브라우저나 Node.js 환경에서 WASM 코드를 생성하는 호스트 역할을 하기 위해 자바스크립트 코드도 생성합니다. 예를 들어 자바스크립트 코드는 C 언어의 `printf`를 브라우저 콘솔 창에 보여주는 기능을 제공합니다.
- **WASI SDK** - C/C++ 코드를 WASM으로 컴파일하고 [WASI](https://github.com/WebAssembly/WASI) 사양을 준수하는 호스트 구현을 가정합니다. WASI는 [WebAssembly System Interface](https://wasi.dev/)를 나타냅니다. 파일 및 파일 시스템, 소켓, 시계 및 난수를 포함하여 여러 운영 체제와 유사한 기능을 정의합니다.WASI SDK로 C/C++ 컴파할 때 웹 어셈블리 코드만 생성되고 자바스크립트 기능은 생성되지 않습니다. 자바스크립트 기능은 C 언어의 `printf` 내용을 출력하기 위해 호스트에 의해 제공되어야 합니다. 예를 들어 [Wasmtime](https://github.com/bytecodealliance/wasmtime)의 런타임에서는 WASI 운영 체제를 연결한 WASI 호스트 구현을 제공합니다.

VS Code에서는 WASI를 지원하기로 했습니다. 우리의 주목적은 브라우저에서 WASM 코드를 실행하는 것이지만 실제로 순수 브라우저 환경에서 실행되지 않습니다. 이는 VS Code 확장 표준 방식이므로 호스트 작업자에게 WebAssemblies를 실행해야 합니다. 확장 호스트 작업자는 브라우저 작업자 API 외에 전체 VS Code 확장 API를 제공합니다. C/C++ 프로그램 호출 중 `printf`를 브라우저 콘솔에 연결하는 대신 VS Code [터미널](https://insiders.vscode.dev/github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.d.ts#L6704) API에 연결하고자 합니다.

emscripten보다 WASI에서 작업이 더 쉬웠습니다. 현재 VS Code WASI 호스트는 [WASI 스냅샷 미리보기1](https://github.com/WebAssembly/WASI/blob/main/legacy/preview1/docs.md)을 기반으로 모든 상세 구현 사항은 블로그 해당 버전을 참조합니다.

## [나만의 웹 어셈블리 코드를 실행할 수 있나요?](https://code.visualstudio.com/blogs/2023/06/05/vscode-wasm-wasi#_how-can-i-run-my-own-webassembly-code)

웹용 VS Code로 Python을 실행한 후 어떤 코드로든 WASI로 컴파일 후 실행할 수 있다는 것을 알게 되었습니다. 그래서 이번 섹션에서는 WASI SDK를 이용한 작은 C 프로그램을 WASI로 컴파일하고 VS Code 확장 호스트 내에 실행하는 방법을 보여줍니다. 이 예제에서는 사용자가 [VS Code 확장 API](https://code.visualstudio.com/api)에 익숙하고 [웹용 VS Code](https://code.visualstudio.com/api/extension-guides/web-extensions) 확장자를 사용하는 방법을 알고 있다고 가정합니다.

다음은 C 프로그램에서 간단한 “Hello World” 프로그램입니다.

```c
#include <stdio.h>

int main(void)
{
    printf("Hello, World\\n");
    return 0;
}
```

최신 WASI SDK가 설치되어 있다고 가정한다면, 해당 경로로 명령어를 사용하여 C 프로그램을 컴파일할 수 있습니다.

```bash
clang hello.c -o ./hello.wasm
```

그러면 `hello.wasm` 옆에 `hello.c`이 생성됩니다.

새로운 기능은 VS Code 확장자를 통해 추가되고 VS Code에 WebAssemblies를 통합할 때 새로운 모델을 가져갑니다. WASM 코드를 로드하고 실행하는 확장자를 정의해야 합니다. `package.json` 매니패스트 확장자의 중요한 부분은 다음과 같습니다.

```json
{
    "name": "...",
    ...,
    "extensionDependencies": [
        "ms-vscode.wasm-wasi-core"
    ],
    "contributes": {
        "commands": [
            {
                "command": "wasm-c-example.run",
                "category": "WASM Example",
                "title": "Run C Hello World"
            }
        ]
    },
    "devDependencies": {
        "@types/vscode": "1.77.0",
    },
    "dependencies": {
        "@vscode/wasm-wasi": "0.11.0-next.0"
    }
}
```

[ms-vscode.wasm-wasi-core](https://marketplace.visualstudio.com/items?itemName=ms-vscode.wasm-wasi-core) 확장자는 WASI API를 VS Code API에 연결하는 웹 어셈블리 실행 엔진을 제공합니다. 노드 모듈은 `@vscode/wasm-wasi` VS Code에서 웹 어셈블리 코드를 로드하고 실행하기 위한 퍼사드를 제공합니다.

다음은 웹 어셈블리 코드를 로드하고 실행하는 실제 타입스크립트 코드입니다.

```tsx
import { Wasm } from "@vscode/wasm-wasi"
import { commands, ExtensionContext, Uri, window, workspace } from "vscode"

export async function activate(context: ExtensionContext) {
  // WASM API 로드합니다.
  const wasm: Wasm = await Wasm.load()

  // C 예제를 실행하는 명령어 등록합니다.
  commands.registerCommand("wasm-wasi-c-example.run", async () => {
    // WASM 프로세스에 studio를 제공하기 위해 의사 터미널 생성합니다.
    const pty = wasm.createPseudoterminal()
    const terminal = window.createTerminal({
      name: "Run C Example",
      pty,
      isTransient: true,
    })
    terminal.show(true)

    try {
      // WASM 모듈 로드하고 JS 코드 확장자와 함께 저장합니다.
      // 따라서 VS Code 파일 시스템 API를 사용 할 수 있고,
      // 코드가 데스크톱이나 웹에서 실행과 상관없이 독립적으로 만들어집니다.
      const bits = await workspace.fs.readFile(Uri.joinPath(context.extensionUri, "hello.wasm"))
      const module = await WebAssembly.compile(bits)
      // WASM 프로세스 생성합니다.
      const process = await wasm.createProcess("hello", module, { stdio: pty.stdio })
      // 프로세스를 실행하고 결과를 기다립니다.
      const result = await process.run()
      if (result !== 0) {
        await window.showErrorMessage(`Process hello ended with error: ${result}`)
      }
    } catch (error) {
      // 에러 메시지를 보여줍니다.
      await window.showErrorMessage(error.message)
    }
  })
}
```

다음 비디오는 웹용 VS Code의 확장자 실행을 보여줍니다.

![https://code.visualstudio.com/assets/blogs/2023/06/05/helloWorld.gif](https://code.visualstudio.com/assets/blogs/2023/06/05/helloWorld.gif)

웹 어셈블리를 위한 C/C++ 코드를 사용했고, WASI 표준에 따라 WASI를 지원하는 다른 툴 체인도 있습니다. (예: [Rust](https://www.rust-lang.org/), [.NET](https://github.com/dotnet/dotnet-wasi-sdk), [Swift](https://swiftwasm.org/) 등)

## [VS Code의 WASI 구현](https://code.visualstudio.com/blogs/2023/06/05/vscode-wasm-wasi#_vs-codes-wasi-implementation)

WASI와 VS Code API는 파일 시스템 또는 stdio와 같은 컨셉을 공유합니다(예: 터미널). VS Code API에서 WASI 사양을 구현 할 수 있었습니다. 하지만 다른 실행 동작에 문제가 있었습니다. 웹 어셈블리 코드 실행은 동기식인 반면(예: 웹 어셈블리 실행 시작하고, 자바스크립트 작업 실행 종료까지 대기), 대부분 VS Code API와 브라우저는 비동기식입니다. 예를 들어 WASI 파일 읽기는 동기식이지만 VS Code API는 비동기 식입니다. 이러한 특성으로 VS Code 확장자 호스트 작업자 내에서 웹 어셈블리 코드 실행에 두 가지 문제점이 발생합니다.

- 웹 어셈블리 코드를 실행하는 동안 다른 확장자가 실행되는 것을 차단할 수 있기 때문에 확장자 호스트가 차단되는 것을 방지해야 합니다.
- 비동기식 VS Code와 브라우저 API 위에서 동작 하려면 동기식 WASI API 구현하기 위해 이 메커니즘이 필요합니다.

첫 번째 쉬운 방법으로는, 웹 어셈블리 코드를 워커 스레드로 나뉘어서 실행합니다. 두 번째 방법은 동기식 코드를 비동기식 코드에 매핑하기 위해 동기식 실행 스레드를 일시 중단합니다. 또한 비동기식으로 계산된 결과를 사용 가능할 때 다시 시작해야 하므로 해결하기가 더 어렵습니다. 웹 어셈블리에서 JavaScript-Promise 통합 제안은 WASM 계층에서 이 문제를 해결하고 V8 의 제안은 실험적 구현이 있습니다. 그러나 우리의 노력에도 불구하고 V8 구현은 아직 제공하지 않았습니다. 그래서 우리는 [SharedArrayBuffer](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)와 [Atomics](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Atomics)를 사용하여 동기식 WASI API를 VS Code의 비동기 API에 매핑하는 방식으로 사용했습니다.

접근 방식은 다음과 같습니다:

- WASM 워커 스레드는 VS Code 측에서 호출해야 하는 코드에 필수 정보가 포함된 `SharedArrayBuffer`를 생성합니다.
- VS Code 확장자 호스트 작업자에게 공유된 메모리를 게시하고 다음 작업자가 [Atomics.wait](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Atomics/wait)를 사용하여 완료할 때까지 기다립니다.
- 확장자 호스트 작업자는 메시지를 받아 적절한 VS Code API를 호출하고, `SharedArrayBuffer` 결과를 재작성한 다음 [Atomics.store](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Atomics/store) 와 [Atomics.notify](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Atomics/notify)를 사용하여 WASM 워커 스레드에 알립니다.
- WASM 작업자는 `SharedArrayBuffer`의 결과 데이터를 읽고 WASI 콜백에 반환합니다.

이런 접근 방식이 어려운 이유는 `SharedArrayBuffer`와 `Atomics`가 [출처 간 격리(cross-origin isolated)](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)를 요구하기 때문입니다. CORS는 바이러스성이 매우 높기 때문에 그 자체로도 사용하기 위해 어느 정도 노력이 필요합니다. 현재 Insiders 버전인 [insiders.vscode.dev](https://insiders.vscode.dev/)에서 기본 셋팅되어 있고, [vscode.dev](https://vscode.dev/)의 `?vscode-coi=on` 쿼리 파라미터를 사용해야만 합니다.

다음은 웹 어셈블리로 컴파일한 C 프로그램 확장 호스트 작업자와 WASM 간의 상호작용을 보여주는 다이어그램입니다. 웹 어셈블리 코드를 나타내는 오렌지색 상자와 자바스크립트를 보여주는 녹색 상자안의 모든 코드를 실행합니다. 노란색 박스는 `SharedArrayBuffer`을 나타냅니다.

![https://code.visualstudio.com/assets/blogs/2023/06/05/diagram.png](https://code.visualstudio.com/assets/blogs/2023/06/05/diagram.png)

## [웹 셸](https://code.visualstudio.com/blogs/2023/06/05/vscode-wasm-wasi#_a-web-shell)

C/C++과 Rust 코드를 웹 어셈블리로 컴파일할 수 있고 VS Code를 실행할 수 있게 되어 웹용 VS Code에서도 쉘을 실행할 수 있는지 확인할 수 있었습니다.

우리는 웹 어셈블리로 유닉스 셸 중 하나를 컴파일하는 방법을 조사했지만, 일부 셸은 현재 WASI를 사용할 수 없는 운영체제 기능(생성 프로세스 등)에 의존되고 있었습니다. 그래서 다른 방식을 취하게 되었는데, 타입스크립트에서 기본 셸을 구현하고 웹 어셈블리로 `ls`, `cat`, `date`와 같은 유닉스 핵심 유틸리티만 컴파일하려고 했습니다. Rust는 WASM과 WASI를 잘 지원하므로 GNU coreutils을 크로스 플랫폼으로 재구성한 [uutils/coreutils](https://github.com/uutils/coreutils)을 가져왔고, 최초로 작은 웹 셸을 만들게 되었습니다.

![https://code.visualstudio.com/assets/blogs/2023/06/05/webshell.gif](https://code.visualstudio.com/assets/blogs/2023/06/05/webshell.gif)

커스텀 웹 어셈블리나 명령어를 실행하기엔 셸은 너무 제한적이었습니다. 웹 셸을 확장하기 위해 웹 셸에 입력할 때 호출되는 명령뿐만 아니라 파일 시스템에 추가로 마운트되는 지점의 다른 확장자를 제공할 수 있었습니다. 명령어를 통한 간접 지시는 터미널에 입력으로부터 상세한 웹 어셈블리 실행을 분리합니다. 처음부터 Python 확장자를 사용하게 되면 프롬프트에 `python app.py`을 입력하거나 기본 python 3.11 라이브러리를 나열하여 셸 내에 Python 코드를 직접 실행할 수 있게 되고 `/usr/local/lib/python3.11` 아래에 마운트됩니다.

![https://code.visualstudio.com/assets/blogs/2023/06/05/python-webshell.gif](https://code.visualstudio.com/assets/blogs/2023/06/05/python-webshell.gif)

## [다음은 무엇입니까?](https://code.visualstudio.com/blogs/2023/06/05/vscode-wasm-wasi#_what-comes-next)

WASM 실행 엔진 확장과 웹 셸 확장 모두 실험 상태이므로 WesAsemblies은 운영까진 준비 단계이기 때문에 아직 사용해서는 안 됩니다. 이 기술들은 초기 피드백을 얻기 위해 공개적으로 제공되었습니다. 질문이나 피드백이 있는 경우 [vscode-wasm](https://github.com/microsoft/vscode-wasm/issues)의 Github 저장소에 이슈를 열어주세요. 이 저장소는 [Python 예제](https://insiders.vscode.dev/github/microsoft/vscode-wasi/blob/main/testbeds/python/extension.ts#L1)와 [WASM 실행 엔진](https://insiders.vscode.dev/github/microsoft/vscode-wasi/blob/main/wasm-wasi-core/package.json#L1) 및 [웹](https://insiders.vscode.dev/github/microsoft/vscode-wasi/blob/main/webshell/package.json#L1) 셸에 대한 소스 코드도 포함되어 있습니다.

다음은 앞으로 더 깊이 탐구할 주제입니다.

- WASI 팀은 미리보기2와 미리보기3를 작업하여 지원할 예정입니다. 새 버전에서는 WASI 호스트 구현 방식이 변경됩니다. 하지만 우리는 WASM 실행 엔진 확장에 노출된 API 대부분을 안정적으 유지할 수 있습니다.
- [WASIX](https://wasix.org/)에서는 futext나 운영 체제와 같은 프로세스를 추가하여 WASI를 확장하려는 시도를 하고 있습니다.
- VS Code 용 많은 언어 서버는 자바스크립트나 타입스크립트보다 다른 언어로 구현됩니다. 우리는 이런 언어 서버에서 `wasm32-wasi`를 컴파일하고 웹용 VS Code에서 실행할 계획입니다.
- 우리는 웹에서 Python 디버깅 개선 작업을 시작했기 때문에 계속 지켜봐 주시길 바랍니다.
- 확장 B가 확장 A가 제공한 웹 어셈블리 코드를 실행할 수 있도록 지원할 것이고, Python 웹 어셈블리를 제공한 확장을 재사용하여 임의의 확장이 Python 코드를 실행할 수 있도록 할 것입니다.
- VS Code의 웹 어셈블리 실행 엔진 위에서 `wasm32-wasi`이 실행되도록 컴파일된 다른 언어 런타임을 보장합니다. [VMware Labs](https://github.com/vmware-labs/webassembly-language-runtimes)는 Ruby 및 PHP `wasm32-wasi` 바이너리를 제공하고 둘 다 VS Code에서 실행됩니다.

감사합니다.

Dirk와 VS Code 팀

즐거운 코딩하세요!
