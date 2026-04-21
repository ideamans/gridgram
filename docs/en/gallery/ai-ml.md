# AI / ML

Model training, retrieval-augmented generation, agent loops, and
serving topologies. A purple theme marks the ML domain; the central
agent / model gets a dramatic sizeScale.

## Training pipeline with a gate

Data → features → train → eval → registry, told as a three-frame
story. Hover and step through: frame 1 is the pipeline at rest,
frame 2 clears the eval gate, frame 3 lands the model in the
registry.

```gg-diagram gallery framing=1-3
doc { cols: 5 }

icon :data  @A1 tabler/database   "Data"
icon :feat  @B1 tabler/puzzle     "Features"
icon :train @C1 tabler/brain      "Train"
icon :eval  @D1 tabler/chart-bar  "Eval"   sizeScale=1.3
icon :reg   @E1 tabler/package    "Registry"

data  --> feat
feat  --> train
train --> eval
eval  --> reg

note @D2 (eval) "Gate:\naccuracy ≥\nbaseline + 0.5%"

# Frame 2+: the eval gate passes.
[2-] icon :eval color=accent { badges: ['check'] }

# Frame 3: registered.
[3] icon :reg color=accent { badges: ['star'] }
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
