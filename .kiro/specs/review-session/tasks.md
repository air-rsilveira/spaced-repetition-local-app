# Implementation Plan: Review Session (Leitner)

## Overview

This feature implements a per-deck review session based on the Leitner spaced repetition system. Users can select a deck and study its due cards by revealing answers, grading themselves as Correct or Incorrect, and seeing the cards promoted (for correct answers) or reset (for incorrect answers) according to Leitner box rules. The dashboard surfaces due-today counts for each deck so users know what to study.

## Tasks

- [x] 1. Create Leitner Module (`lib/leitner.ts`)
  - Implement `getInterval(box)` → returns 1,2,4,8,16 days for boxes 1-5
  - Implement `isDue(card, today)` → boolean
  - Implement `getDueCards(deck, today)` → Card[]
  - Implement `promoteCard(card, today)` → Card
  - Implement `resetCard(card, today)` → Card
  - _Requirements: 2, 3, 5, 6, 10_

  - [x] 1.1 Write unit tests for `getInterval()`
    - Test all boxes 1-5 return correct intervals
    - Test box < 1 or > 5 throws error
    - _Requirements: 10_

  - [x] 1.2 Write unit tests for `isDue()`
    - Test new cards (lastReviewed = null) are always due
    - Test cards due at exact interval boundary
    - Test cards not due before interval boundary
    - _Requirements: 2_

  - [x] 1.3 Write unit tests for `getDueCards()`
    - Test filters only due cards from deck
    - Test empty array when no cards are due
    - Test original deck not modified
    - _Requirements: 2_

  - [x] 1.4 Write unit tests for `promoteCard()`
    - Test increments box by 1
    - Test caps at Box 5
    - Test sets lastReviewed to today
    - _Requirements: 5_

  - [x] 1.5 Write unit tests for `resetCard()`
    - Test always sets box to 1
    - Test sets lastReviewed to today
    - _Requirements: 6_

- [x] 2. Update DecksContext (`contexts/DecksContext.tsx`)
  - Add `updateCard(deckId, cardId, updates)` method
    - The method already exists but needs to support updating box and lastReviewed fields
  - Add grade card action that calls promoteCard/resetCard
    - Grade Correct → call promoteCard then updateCard
    - Grade Incorrect → call resetCard then updateCard
  - _Requirements: 4, 5, 6, 7_

  - [x] 2.1 Write unit tests for grade card actions
    - Test Correct grading promotes card
    - Test Incorrect grading resets card
    - Test persistence via updateCard
    - _Requirements: 7_

- [x] 3. Create Review Page (`app/deck/[id]/review/page.tsx`)
  - "use client" component
  - Load deck by ID from route params
  - Get due cards using `getDueCards(deck, today)`
  - Show "No cards due" if empty (Requirement 2.3)
  - Display card with front/back toggle (Requirement 3.1-3.4)
  - Handle Correct/Incorrect grading (Requirement 4.1-4.4)
  - Show progress indicator (Requirement 8.3)
  - Show completion summary (Requirement 8.2)
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8_

  - [x] 3.1 Create ReviewPage component structure
    - Create file at `app/deck/[id]/review/page.tsx`
    - Use "use client" directive
    - Parse route params to get deck ID
    - Load deck using `useDecks()`
    - Handle "Deck not found" state (Requirement 1.2)
    - _Requirements: 1_

  - [x] 3.2 Implement due cards filtering
    - Calculate due cards using `getDueCards(deck, today)`
    - Show "No cards due" message if empty
    - _Requirements: 2_

  - [x] 3.3 Implement card review interface
    - Display current card with front side
    - Handle tap to reveal back
    - Use markdown rendering for card content
    - _Requirements: 3_

  - [x] 3.4 Implement grading functionality
    - Show Correct/Incorrect buttons when back revealed
    - Call promoteCard for Correct answer
    - Call resetCard for Incorrect answer
    - Update card via DecksContext
    - _Requirements: 4, 5, 6, 7_

  - [x] 3.5 Implement progress tracking
    - Show progress indicator (X of Y cards reviewed)
    - Advance to next card after grading
    - _Requirements: 8.1_

  - [x] 3.6 Implement completion summary
    - Show summary when all cards reviewed
    - Display completion message
    - Provide option to return to deck detail
    - _Requirements: 8.2_

  - [x] 3.7 Write property tests for review page
    - **Property 5: Due cards decrease after review**
    - **Validates: Requirements 7, 8**
    - Test that grading a card reduces due count by 1

  - [x] 3.8 Write unit tests for edge cases
    - Test single card review
    - Test empty due cards
    - Test promotion cap at Box 5
    - Test reset to Box 1
    - _Requirements: 5, 6_

- [x] 4. Update Dashboard (`app/page.tsx` and `components/Dashboard.tsx`)
  - Calculate due count per deck using `getDueCards(deck, today)`
  - Display due count badge on DeckCard
  - Use same `isDue()` logic as review session
  - _Requirements: 9_

  - [x] 4.1 Update Dashboard to calculate due counts
    - Import `getDueCards` from `@/lib/leitner`
    - Calculate due count for each deck
    - Pass due count to DeckCard component
    - _Requirements: 9_

  - [x] 4.2 Write property tests for dashboard due counts
    - **Property 1: New cards are always due**
    - **Validates: Requirements 2, 4, 9**
    - Test that decks with new cards show correct due count

- [x] 5. Update DeckCard Component
  - Accept `dueCount` prop
  - Display due count badge
  - _Requirements: 9_

  - [x] 5.1 Update DeckCard interface
    - Add `dueCount` prop to DeckCardProps
    - _Requirements: 9_

  - [x] 5.2 Display due count badge
    - Show badge next to card count
    - Use AWS color palette (gray for count, orange for badge)
    - Only show badge if dueCount > 0
    - _Requirements: 9_

  - [x] 5.3 Write unit tests for due count display
    - Test badge shows correct count
    - Test badge hidden when count is 0
    - _Requirements: 9_

- [x] 6. Integration Tests
  - End-to-end review session flow
  - Due count updates after grading
  - Persistence verification
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9_

  - [x] 6.1 Test end-to-end review session
    - Navigate to review page
    - Review all due cards
    - Verify completion summary
    - _Requirements: 1, 2, 3, 4, 5, 6, 8_

  - [x] 6.2 Test due count updates after grading
    - Start with deck that has due cards
    - Grade a card
    - Verify dashboard due count decreases
    - _Requirements: 7, 9_

  - [x] 6.3 Test persistence verification
    - Grade cards in review session
    - Reload page
    - Verify cards are promoted/reset correctly
    - _Requirements: 7_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"] },
    { "id": 1, "tasks": ["2.1", "5.1", "5.2", "5.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "4.1", "4.2"] },
    { "id": 3, "tasks": ["3.5", "3.6", "3.7", "3.8"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3"] }
  ]
}
```