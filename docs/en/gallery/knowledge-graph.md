# Knowledge graph

Concept hierarchies, taxonomies, and relationship networks.

## Taxonomy

Strict tree: every node has exactly one parent. Good for file
systems, category browsing, biological classification.

```gg-diagram gallery
doc { cols: 3, rows: 3 }

icon :anim @B1 tabler/paw        "Animal" sizeScale=1.3
icon :mam  @A2 tabler/paw        "Mammal"
icon :bir  @C2 tabler/feather    "Bird"
icon :cat  @A3 tabler/cat        "Cat"
icon :dog  @B3 tabler/dog        "Dog"
icon :eag  @C3 tabler/feather    "Eagle"

anim --> mam
anim --> bir
mam  --> cat
mam  --> dog
bir  --> eag
```

## Faceted tags

Items categorised along multiple independent axes. A "cross-cutting"
model — nothing is in a strict hierarchy anymore.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :item @B2 tabler/box       "Item"
icon :col  @A1 tabler/palette   "Color"
icon :siz  @C1 tabler/ruler     "Size"
icon :use  @D1 tabler/tag       "Use"
icon :mat  @A3 tabler/stack     "Material"

item <-> col
item <-> siz
item <-> use
item <-> mat
```

## Concept relations

Nouns connected by named edges — the skeleton of a small ontology.
RDF / Wikidata graphs look like this with more vocabulary.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :author @A2 tabler/user      "Author"
icon :book   @B2 tabler/book      "Book"
icon :topic  @D1 tabler/tag       "Topic"
icon :pub    @D2 tabler/building  "Publisher"
icon :year   @D3 tabler/calendar  "Year"

author --> book  "wrote"
book   --> topic "about"
book   --> pub   "by"
book   --> year  "in"
```

## Knowledge graph for an agent

What an LLM "sees" when you hand it a knowledge graph for
retrieval. Each edge is a typed relation the agent can traverse.

```gg-diagram gallery
doc { cols: 4, rows: 3 }

icon :q    @A2 tabler/search     "Query"
icon :ent  @B2 tabler/box        "Entity"
icon :rel1 @C1 tabler/link       "relatedTo"
icon :rel2 @C3 tabler/link       "partOf"
icon :res  @D2 tabler/bulb       "Answer"

q    --> ent
ent  --> rel1
ent  --> rel2
rel1 --> res
rel2 --> res
```
