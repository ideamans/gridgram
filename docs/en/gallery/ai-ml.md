# AI / ML

Model training, retrieval-augmented generation, agent loops, and
serving topologies. A purple theme marks the ML domain; the central
agent / model gets a dramatic sizeScale.

## Training pipeline

Data → features → train → eval → registry. Theme override pulls
the whole pipeline into a domain-appropriate palette; the training
stage carries the visual weight.

```gg-diagram gallery
doc {
  cols: 5,
  theme: { primary: '#6d28d9', secondary: '#7c3aed', accent: '#db2777' },
}

region @A1:B1 "Data prep"  color=secondary/24
region @D1:E1 "Ship"       color=primary/24

icon :data  @A1 tabler/database      "Data"
icon :feat  @B1 tabler/refresh       "Features"
icon :train @C1 tabler/brain         "Train"     sizeScale=1.5
icon :eval  @D1 tabler/chart-dots    "Eval"
icon :reg   @E1 tabler/package       "Registry"

data  --> feat
feat  --> train
train --> eval
eval  --> reg

note @D2 [eval] "Gate:\naccuracy ≥\nbaseline + 0.5%"
```

## RAG: retrieval-augmented generation

The model's answer is grounded in documents retrieved from a vector
store. The LLM sits at the centre with the weight; the store / docs
feed it as a region.

```gg-diagram gallery
doc {
  cols: 4, rows: 2,
  theme: { primary: '#6d28d9', accent: '#db2777' },
}

region @B1:C2 "Retrieve" color=primary/24

icon :q     @A1 tabler/search   "Query"
icon :embed @B1 tabler/brain    "Embed"
icon :vec   @C1 tabler/database "Vector DB" sizeScale=1.2
icon :docs  @C2 tabler/files    "Docs"
icon :llm   @D1 tabler/sparkles "LLM" sizeScale=1.6
icon :ans   @D2 tabler/message  "Answer"

q     --> embed
embed --> vec
vec   --> docs  "top-k"
docs  --> llm   "context" width=2
llm   --> ans
```

## Agent + tools (MCP-style)

A giant agent in the middle, compact tool satellites around it.
Size variation makes the "orchestrator vs capability" relationship
obvious.

```gg-diagram gallery
doc {
  cols: 3, rows: 3,
  theme: { primary: '#6d28d9', accent: '#db2777' },
}

icon :user  @A2 tabler/user    "User"
icon :agent @B2 tabler/robot   "Agent" sizeScale=2.0
icon :t1    @C1 tabler/search  "Search"
icon :t2    @C2 tabler/code    "Code"
icon :t3    @C3 tabler/database "DB"

user  --> agent
agent <-> t1  "call"
agent <-> t2  "call"
agent <-> t3  "call"
```

## Online serving with cache

A prediction service fronted by a cache. Cold queries fall through
to the model; results are written back.

```gg-diagram gallery
doc {
  cols: 4,
  theme: { primary: '#6d28d9', accent: '#db2777' },
}

region @A1:A1 "Client"  color=accent/24
region @B1:C1 "Serve"   color=primary/24
region @D1:D1 "Response" color=accent/32

icon :req   @A1 tabler/device-mobile "Request"
icon :cache @B1 tabler/bolt          "Cache"
icon :model @C1 tabler/brain         "Model" sizeScale=1.4
icon :resp  @D1 tabler/check         "Response"

req   --> cache
cache --> resp  "hit"  width=2
cache --> model "miss" dash="2 4"
model --> cache "store" dash="2 4"
model --> resp
```
