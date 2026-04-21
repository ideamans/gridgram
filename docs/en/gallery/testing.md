# Testing

Test organisation, CI matrices, and environment topologies.

## Test pyramid

Many fast unit tests at the base, fewer integration tests in the
middle, very few end-to-end tests at the top. Inverts the "ice-cream
cone" anti-pattern where slow E2E dominate.

```gg-diagram gallery
doc { cols: 3, rows: 3 }

icon :e2e  @B1 tabler/eye        "E2E"
icon :int  @A2 tabler/link       "Int"
icon :int2 @C2 tabler/link       "Int"
icon :u1   @A3 tabler/circle-check "Unit"
icon :u2   @B3 tabler/circle-check "Unit"
icon :u3   @C3 tabler/circle-check "Unit"

e2e --> int
e2e --> int2
int  --> u1
int  --> u2
int2 --> u3
```

## CI matrix: OS × language version

Same test suite, multiple targets. Any red cell blocks the merge.

```gg-diagram gallery
doc { cols: 5, rows: 3 }

icon :src    @A2 tabler/git-commit "Commit"
icon :m1     @C1 tabler/server     "linux/18"
icon :m2     @C2 tabler/server     "linux/20"
icon :m3     @C3 tabler/server     "linux/22"
icon :w1     @D1 tabler/server     "macos/20"
icon :w2     @D2 tabler/server     "win/20"
icon :merge  @E2 tabler/check      "Merge"

src --> m1
src --> m2
src --> m3
src --> w1
src --> w2
m1 --> merge
m2 --> merge
m3 --> merge
w1 --> merge
w2 --> merge
```

## Test environments

Each environment is a deployment target tuned for a different
feedback loop. Smoke tests gate promotion.

```gg-diagram gallery
doc { cols: 5 }

icon :local  tabler/device-laptop "Local"
icon :ci     tabler/settings      "CI"
icon :stage  tabler/server        "Staging"
icon :perf   tabler/chart-bar     "Perf"
icon :prod   tabler/rocket        "Prod"

local --> ci
ci    --> stage
stage --> perf  "nightly"
stage --> prod  "approve"
```

## Test coverage feedback

Coverage reports attach to PRs so reviewers see which lines the new
code actually exercised.

```gg-diagram gallery
icon :test    tabler/check       "Tests"
icon :cov     tabler/percentage  "Coverage"
icon :report  tabler/file-text   "Report"
icon :pr      tabler/git-pull-request "PR"

test   --> cov     "measure"
cov    --> report  "collect"
report --> pr      "annotate"
```
