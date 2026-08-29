# JSON Import/Export Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SPACED REPETITION APP                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              PRESENTATION LAYER (Components)        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │  Dashboard                    Deck Detail           │  │
│  │  ┌─────────────────────┐   ┌──────────────────┐   │  │
│  │  │ ImportControl       │   │ Header (dark)    │   │  │
│  │  │ ├─ File Input       │   │ ├─ Deck Name    │   │  │
│  │  │ ├─ Error Message    │   │ ├─ Add Card (+) │   │  │
│  │  │ └─ Duplicate Modal  │   │ └─ Export (⬇️)  │   │  │
│  │  └─────────────────────┘   └──────────────────┘   │  │
│  │                                                    │  │
│  │  Deck Card List                                   │  │
│  │  ┌─────────────────────────────────┐             │  │
│  │  │ DeckCard                        │             │  │
│  │  │ ├─ Name / Cards / Due          │             │  │
│  │  │ └─ DeckCardActions              │             │  │
│  │  │    ├─ Edit (✏️)                 │             │  │
│  │  │    ├─ Export (⬇️)  ←────────┐  │             │  │
│  │  │    └─ Delete (🗑️)          │  │             │  │
│  │  └─────────────────────────────┤─┘             │  │
│  │                                  │              │  │
│  └──────────────────────────────────┼──────────────┘  │
│                                     │                 │
├─────────────────────────────────────┼─────────────────┤
│           STATE MANAGEMENT LAYER    │                 │
├─────────────────────────────────────┼─────────────────┤
│                                     │                 │
│  ┌─────────────────────────────────▼──────────────┐  │
│  │        DecksContext (useDecks hook)            │  │
│  │  ├─ decks: Deck[]                             │  │
│  │  ├─ addDeck(input) → AddDeckResult            │  │
│  │  ├─ updateDeck(id, card) → UpdateDeckResult  │  │
│  │  ├─ deleteDeck(id) → DeleteDeckResult        │  │
│  │  ├─ replaceDeck(deck) → ReplaceDeckResult ← │  │
│  │  ├─ addCard/updateCard/deleteCard/grade...  │  │
│  │  └─ status / error                           │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                   │
├─────────────────┼───────────────────────────────────┤
│    LOGIC & I/O LAYER                │               │
├─────────────────┼───────────────────────────────────┤
│                 │                                   │
│  ┌──────────────▼────────────────────────────────┐ │
│  │      lib/deckIO.ts (Core I/O Logic)           │ │
│  │                                                │ │
│  │  serializeDeck(deck: Deck): string             │ │
│  │  ├─ Validate input                            │ │
│  │  ├─ Convert to JSON                           │ │
│  │  └─ Return JSON string                        │ │
│  │                                                │ │
│  │  parseDeck(input: unknown):                    │ │
│  │  │ { ok: true; data: Deck }                   │ │
│  │  │ { ok: false; error: string }               │ │
│  │  ├─ Parse JSON                                │ │
│  │  ├─ Validate against DeckSchema               │ │
│  │  ├─ Return discriminated union                │ │
│  │  └─ Clear error messages on failure           │ │
│  │                                                │ │
│  └────────────┬─────────────────────────┬────────┘ │
│               │                         │          │
│           Serialize                  Parse        │
│               │                         │          │
├───────────────┼─────────────────────────┼──────────┤
│    BROWSER APIS & FILE I/O              │          │
├───────────────┼─────────────────────────┼──────────┤
│               │                         │          │
│        ┌──────▼──────┐           ┌─────▼──────┐  │
│        │ File Download │         │ File Input  │  │
│        │ (Blob API)    │         │ (File API)  │  │
│        └───────────────┘         └─────────────┘  │
│               │                         │          │
│               │ user.json              │ deck.json│
│               ▼                         ▼          │
│            💾                         📁          │
│         Browser Download          User's Device   │
│                                                   │
└─────────────────────────────────────────────────────┘
```

---

## Data Flow: Export

```
User clicks "Export" button
        │
        ▼
ExportControl.tsx
├─ setIsExporting(true)
├─ Call serializeDeck(deck)
│        │
│        ▼
│  lib/deckIO.ts
│  ├─ Validate deck
│  ├─ JSON.stringify(deck)
│  └─ Return: string
├─ Create Blob from JSON string
├─ Create URL from Blob
├─ Create <a> element
├─ Trigger click (download)
├─ Clean up URL
├─ setIsExporting(false)
└─ Call onExportEnd() callback
        │
        ▼
User's file system
└─ deck.json (downloaded)
```

---

## Data Flow: Import

```
User selects file from input
        │
        ▼
ImportControl.tsx
├─ File is read
├─ FileReader.readAsText()
        │
        ▼
parseJSON() helper
├─ JSON.parse(fileContent)
└─ Return: unknown
        │
        ▼
lib/deckIO.ts (parseDeck)
├─ Validate against DeckSchema (Zod)
├─ Success: { ok: true; data: Deck }
└─ Failure: { ok: false; error: string }
        │
        ├─ If error: Show error alert
        │  └─ User can retry
        │
        └─ If valid:
           ├─ Check for duplicate ID
           │
           ├─ If unique ID:
           │  └─ useDecks().addDeck(importedDeck)
           │     │
           │     ▼
           │  Deck added to dashboard
           │
           └─ If duplicate ID:
              ├─ Show DuplicateModal
              │  ├─ "Cancel" → abort
              │  ├─ "Import as new" → generate unique ID
              │  │  └─ useDecks().addDeck(newDeck)
              │  └─ "Replace" → overwrite
              │     └─ useDecks().replaceDeck(importedDeck)
              │
              ▼
           Deck updated/replaced in dashboard
```

---

## Component Dependency Graph

```
Dashboard
├─ ImportControl ────────────────┐
│                                 │ uses
├─ DeckCardList                   │
│  └─ DeckCard                    │
│     └─ DeckCardActions          │
│        └─ ExportControl ────────┤
└─ EmptyState                     │
   └─ ImportControl (same)        │
        │
        ├─ Calls: useDecks()
        │  ├─ addDeck()
        │  ├─ replaceDeck()
        │  └─ error handling
        │
        └─ Uses: lib/deckIO.ts
           ├─ serializeDeck()
           └─ parseDeck()

Deck Detail
├─ Header (dark background)
│  └─ ExportControl
│     ├─ Calls: useDecks()
│     └─ Uses: lib/deckIO.ts
```

---

## Type System

```typescript
// ─── Discriminated Union for Error Handling ───

// Success case
{ ok: true; data: Deck }

// Failure case
{ ok: false; error: string }

// Usage
const result = parseDeck(jsonString);
if (result.ok) {
  // result.data is Deck
  useDecks().addDeck(result.data);
} else {
  // result.error is string
  showErrorMessage(result.error);
}


// ─── Add Deck Result (from DecksContext) ───

type AddDeckResult = 
  | { ok: true; data: Deck }
  | { ok: false; error: AddDeckError }

type AddDeckError = 
  | { kind: "invalid_deck"; details: string }
  | { kind: "duplicate_id"; existingDeck: Deck }


// ─── Replace Deck Result ───

type ReplaceDeckResult =
  | { ok: true; data: Deck }
  | { ok: false; error: string }
```

---

## State Management

### DecksContext Hierarchy

```
DecksContext (global state)
├─ decks: Deck[]
│  └─ Each Deck contains:
│     ├─ id: string
│     ├─ name: string
│     ├─ description?: string
│     ├─ cards: Card[]
│     └─ createdAt: string
├─ status: "loading" | "ready" | "error"
├─ error: DecksError | null
├─ addDeck(input)
├─ updateDeck(id, card)
├─ deleteDeck(id)
├─ replaceDeck(deck) ← NEW
├─ addCard(deckId, card)
├─ updateCard(deckId, cardId, updates)
├─ deleteCard(deckId, cardId)
├─ gradeCardCorrect(deckId, cardId)
└─ gradeCardIncorrect(deckId, cardId)

DecksProvider
└─ Wraps app in contexts/DecksContext.tsx
```

---

## File I/O Architecture

### Export Flow

```
┌─────────────────┐
│  ExportControl  │
└────────┬────────┘
         │ onClick
         ▼
┌──────────────────────┐
│ lib/deckIO.ts        │
│ serializeDeck()      │
└────────┬─────────────┘
         │ returns JSON string
         ▼
┌──────────────────────┐
│ Create Blob          │
│ Create Object URL    │
│ Create <a> element   │
│ Trigger download     │
└──────────────────────┘
         │ no storage
         ▼
    Browser Download
         │
         ▼
    User's device (deck.json)
```

### Import Flow

```
┌──────────────────┐
│ User selects file│
└────────┬─────────┘
         │ FileReader.readAsText()
         ▼
┌──────────────────────────────┐
│ File content as string       │
└────────┬─────────────────────┘
         │ parseJSON()
         ▼
┌──────────────────────────────┐
│ lib/deckIO.ts                │
│ parseDeck(jsonString)        │
│ - Validate with Zod          │
│ - Return discriminated union │
└────────┬─────────────────────┘
         │ if error
         ├─────────────────────┐
         │                     ▼
         │            Show error alert
         │
         │ if success
         ▼
┌──────────────────────────────┐
│ Check for duplicate ID       │
├──────────────────────────────┤
│ Unique? → addDeck()          │
│ Duplicate? → Show modal ──┐  │
└──────────────────────────┼──┘
                           │
                    User chooses:
                    ├─ Cancel
                    ├─ New ID → addDeck()
                    └─ Replace → replaceDeck()
                           │
                           ▼
                    DecksContext update
                           │
                           ▼
                    Dashboard re-renders
```

---

## Error Handling Strategy

```
┌─────────────────────────────────────┐
│     All Operations                  │
└────────────────┬────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
    Success          Error
         │               │
         ▼               ▼
    ┌───────┐       ┌─────────────────┐
    │ Done  │       │ Discriminated   │
    └───────┘       │ Union: ok=false │
                    │ error: string   │
                    └────────┬────────┘
                             │
                      ┌──────┴──────┐
                      │             │
                 Show to user   Log to console
                      │
                      ├─ Alert message
                      ├─ Input placeholder
                      └─ Error state on button

Benefits:
✓ No uncaught exceptions
✓ Type-safe error handling
✓ Clear error messages
✓ Graceful recovery
✓ Easier testing
```

---

## Testing Architecture

```
┌────────────────────────────────────────┐
│        Testing Pyramid                 │
└────────────────────────────────────────┘

    ▲
   /│\           Integration Tests (15)
  / │ \          - Full export/import
 /  │  \         - Duplicate handling
/───┼───\        - Error recovery
    │   \
    │    \       Unit: UI Tests (23)
    │     \      - ExportControl (11)
    │      \     - ImportControl (12)
 ───┼───────\
    │        \
    │         \  Unit: Core Tests (35)
    │          \ - deckIO.test (26)
    │           \- deckIO.property (9)
────┼───────────\
   /│\           
  / │ \
 /  │  \

Coverage: 73 tests
All critical paths tested
All error cases covered
Edge cases included
```

---

## Module Dependencies

```
Components Layer
    │
    ├─ ExportControl.tsx
    │  └─ depends on: lib/deckIO.ts
    │
    ├─ ImportControl.tsx
    │  ├─ depends on: lib/deckIO.ts
    │  └─ depends on: contexts/DecksContext.ts
    │
    ├─ Dashboard.tsx
    │  ├─ imports: ExportControl
    │  ├─ imports: ImportControl
    │  └─ depends on: contexts/DecksContext.ts
    │
    └─ app/deck/[id]/page.tsx
       ├─ imports: ExportControl
       └─ depends on: contexts/DecksContext.ts

Core Layer
    │
    ├─ lib/deckIO.ts
    │  └─ depends on: types/index.ts (Deck type)
    │
    └─ contexts/DecksContext.tsx
       ├─ depends on: types/index.ts
       └─ depends on: lib/storage.ts (persistence)

Type Layer
    │
    └─ types/index.ts
       ├─ Deck type definition
       ├─ Card type definition
       └─ Result union types
```

---

## Deployment Architecture

```
Development
    │
    ├─ npm run dev → local server (localhost:3000)
    └─ npm run test → run all tests
    
Build
    │
    ├─ npm run build
    │  ├─ TypeScript compilation
    │  ├─ Next.js optimization
    │  └─ Static generation
    └─ Output: .next/ directory

Production
    │
    ├─ Deploy .next/ to hosting
    │  (Vercel, AWS, etc.)
    └─ User accesses deployed app
       ├─ Export: Browser downloads JSON
       └─ Import: File picker → Parse → Add
```

---

## Scaling Considerations

### For Large Decks (1000+ cards)

Current: Synchronous serialization
- Typical deck (10-100 cards): < 100ms ✓
- Large deck (1000+ cards): ~500ms-1s (may freeze UI)

**Future Enhancement**: Use Web Workers
```javascript
// Non-blocking serialization
const worker = new Worker('serialize-worker.js');
worker.postMessage({ deck });
worker.onmessage = (e) => {
  const jsonString = e.data;
  // download...
};
```

### For Many Decks (100+)

Current: Works fine (filtering and pagination handled by Dashboard)

**Future Enhancement**: Selective export
```typescript
exportDecks([deckId1, deckId2, ...], format: 'json' | 'zip')
```

---

## Security Considerations

✅ **Input Validation**
- All imports validated against Zod schema
- Invalid JSON rejected
- Type checking prevents injection

✅ **No Data Transmission**
- All operations local to browser
- No server calls required
- No external API dependencies

✅ **File Handling**
- File picker via native browser dialog
- No programmatic file access outside picker
- Blob creation for download is safe

⚠️ **Local Storage**
- Decks stored in browser localStorage
- User's device security responsibility
- No encryption (browser default)

---

**Architecture designed for scalability, maintainability, and accessibility.**
