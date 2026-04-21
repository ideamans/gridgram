# Org chart

People and reporting lines. Gridgram's grid layout handles shallow
hierarchies well; for deep trees, consider a dedicated tree layout
tool.

## Team with real photo avatars

Swaps the silhouette icons for actual headshots (placeholders via
`picsum.photos`). `clip=circle` rounds each photo into an avatar
disc; `iconTheme=native` preserves the original photo colours instead
of tinting them with the node's theme colour.

<Example name="team-photos" />

Raster assets behave the same as Tabler icons everywhere else —
`pos`, `sizeScale`, regions, and connectors work unchanged. The
difference is just which file the icon resolver serves for
`src=...`.


## Small-company reporting

CEO at the top, functional reports below. No cross-connections —
every report has exactly one manager.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :ceo @B1 tabler/user-star "CEO"  sizeScale=1.4 { badges: ['star'] }
icon :cto @A2 tabler/user      "CTO"
icon :cpo @C2 tabler/user      "CPO"
icon :cfo @D2 tabler/user      "CFO"

ceo --> cto
ceo --> cpo
ceo --> cfo
```

## Engineering team shape

Director with two line managers, each with engineers. A squad
reports to its line manager but takes technical direction from a
principal.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :dir  @B1 tabler/user-star  "Director"
icon :m1   @A2 tabler/user       "EM A"
icon :m2   @C2 tabler/user       "EM B"
icon :e1   @A3 tabler/users      "team A"
icon :e2   @C3 tabler/users      "team B"
icon :prin @D2 tabler/star       "Principal"

dir --> m1
dir --> m2
m1  --> e1
m2  --> e2
prin --> e1 "tech"
prin --> e2 "tech"
```

## Matrix organization

Employees report to both a functional manager (discipline) and a
project manager (product). The "two hats" problem visualised.

```gg-diagram gallery
doc { cols: 3, rows: 2 }

icon :eng @A1 tabler/users     "Eng"
icon :des @C1 tabler/palette   "Design"
icon :p1  @A2 tabler/briefcase "Prod A"
icon :p2  @C2 tabler/briefcase "Prod B"

eng --> p1
eng --> p2
des --> p1
des --> p2
```

## Squad / tribe structure

Spotify-style model. A tribe is a business-area grouping of squads;
chapters are cross-squad disciplines; guilds are voluntary
communities of practice.

```gg-diagram gallery
doc { cols: 4, rows: 2 }

icon :tribe @B1 tabler/users-group "Tribe" sizeScale=1.2
icon :s1    @A2 tabler/users "Squad A"
icon :s2    @C2 tabler/users "Squad B"
icon :chap  @D1 tabler/hierarchy "Chapter"
icon :guild @D2 tabler/users "Guild"

tribe --> s1
tribe --> s2
chap  --> s1
chap  --> s2
```
