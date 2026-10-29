# claude-turn-duration

**한국어** | [English](docs/README.en.md) | [日本語](docs/README.ja.md)

Claude Desktop 답변 아래에도 터미널처럼 `✻ Churned for 5s · done 14:48` 줄을 그려주는 Claude Code mod입니다.

Claude Code 터미널은 답변이 끝날 때마다 걸린 시간과 끝난 시각을 한 줄로 보여주지만, Claude Desktop에는 이 줄이 보이지 않습니다. 그래서 Claude Code의 mod(hooks 모듈)로 같은 줄을 직접 그리도록 구현했습니다.

| Claude Desktop (이 mod) | 터미널 (Claude Code 기본) |
| --- | --- |
| ![Claude Desktop](docs/images/desktop.png) | ![Terminal](docs/images/terminal.png) |

## 설치

Claude Code 터미널 프롬프트에서:

```
/plugin install turn-duration --marketplace M1nu0x0/claude-turn-duration
```

`Add marketplace?`에 `y`를 누르고 scope는 user를 고릅니다. 셸에서는 이렇게 설치합니다.

```sh
claude plugin install turn-duration --marketplace M1nu0x0/claude-turn-duration
```

Claude Desktop에서는 프롬프트 옆 `+` → Plugins → Add marketplace에 `M1nu0x0/claude-turn-duration`을 넣고 `turn-duration`을 추가합니다.

## 동작

- 메인 에이전트의 턴이 끝나면(`turn.complete`) 걸린 시간과 끝난 시각으로 `✻ <단어> for <시간> · done <시각>` 줄을 만들어 둡니다. 서브에이전트 턴과 빈 답변은 건너뜁니다.
- 답변 블록을 그릴 때(`ui.render`, `AssistantMessage`) 그 답변의 마지막 블록 아래에 흐린 기울임꼴로 붙입니다.
- 시간은 1분 미만이면 `36s`, 넘으면 `1m 4s`로 표시합니다.
- 시각은 OS의 12/24시간 설정과 로케일을 읽어 맞춥니다. OS를 따로 판별하지 않고 아래 설정을 모두 읽어 보며, 읽히는 값만 씁니다. 아무것도 읽지 못하면 런타임 기본 로케일을 씁니다.
  - macOS: `defaults read -g`의 `AppleICUForce24HourTime`, `AppleICUForce12HourTime`, `AppleLocale`
  - Windows: `HKCU\Control Panel\International`의 `sShortTime`(`HH:mm`이면 24시간, `tt h:mm`이면 12시간), `LocaleName`
  - Linux: 로케일은 `LC_ALL` > `LC_TIME` > `LANG`, 12/24시간은 GNOME의 `org.gnome.desktop.interface clock-format`
- 앞 단어(`Churned`, `Crunched`, `Brewed` 등)는 터미널이 고른 단어를 mod가 받을 수 없어서 자체 목록에서 무작위로 고릅니다.

## 터미널에서는

터미널에 보이는 `✻ … for Ns` 줄은 이 mod가 아니라 Claude Code가 원래 그리는 TurnDuration 줄입니다. mod는 터미널에서는 줄을 더하지 않도록 코드에서 막혀 있어서 두 번 보이지 않습니다.

## 구성

```
.claude-plugin/
  plugin.json        플러그인 매니페스트
  marketplace.json   이 레포 자체를 마켓플레이스로 등록
hooks/
  hooks.json         hooks 모듈 목록
  register.tsx       turn.complete / ui.render 훅
  format.ts          단어, 시간, 시각 포맷
types/index.d.ts     $.state 타입 계약
tests/               claude plugin test 용 테스트
docs/                README 번역본(en, ja), 스크린샷
```

## 개발

```sh
claude plugin validate .
claude plugin test .
```

## License

MIT
