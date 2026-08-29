# Requirements Document

## Introduction

This feature implements a per-deck review session based on the Leitner spaced repetition system. Users can select a deck and study its due cards by revealing answers, grading themselves as Correct or Incorrect, and seeing the cards promoted (for correct answers) or reset (for incorrect answers) according to Leitner box rules. The dashboard surfaces due-today counts for each deck so users know what to study. All changes persist to localStorage via the existing DecksContext.

## Glossary

- **Leitner Box**: A spaced repetition technique where cards are organized into 5 boxes based on how well they are remembered. Box 1 is reviewed daily, while Box 5 is reviewed every 16 days.
- **Due Card**: A card that is ready for review based on its box number and last reviewed date. A card becomes due when the current date is equal to or later than the due date calculated from its interval.
- **Interval**: The number of days until a card is reviewed again, based on its Leitner box (Box 1 = 1 day, Box 2 = 2 days, Box 3 = 4 days, Box 4 = 8 days, Box 5 = 16 days).
- **Promote**: To move a card to the next higher box when the user answers correctly, increasing the interval until the next review.
- **Reset**: To move a card back to Box 1 when the user answers incorrectly, restarting the spaced repetition cycle with a 1-day interval.
- **Review Session**: A sequence of card reviews for a single deck, where users reveal answers, grade their performance, and see cards updated according to Leitner rules.

## Requirements

### Requirement 1: Review Session Access

**User Story:** As a user, I want to navigate to a review session for a specific deck, so that I can study its due cards.

#### Acceptance Criteria

1. WHEN a user navigates to `/deck/[id]/review` THEN the System SHALL display the review session interface for that deck
2. IF the deck ID does not exist THEN the System SHALL display a "Deck not found" state
3. WHEN a user is in a review session THEN the System SHALL display the deck name in the header

### Requirement 2: Due Card Detection

**User Story:** As a user, I want to see only cards that are due for review, so that I can focus on what needs to be studied today.

#### Acceptance Criteria

1. WHEN a review session starts THEN the System SHALL filter the deck's cards to include only those that are due on the current date
2. A card is due WHEN its `lastReviewed` field is null OR WHEN the current date is equal to or later than the due date calculated from `lastReviewed + interval(box)`
3. IF no cards are due THEN the System SHALL display a "No cards due" message
4. THE System SHALL calculate the due date as `lastReviewed + getInterval(box)` days

### Requirement 3: Card Review Interface

**User Story:** As a user, I want to view a card's front and back sides, so that I can study the content.

#### Acceptance Criteria

1. WHEN a review session displays a card THEN the System SHALL show the card's front side by default
2. WHEN a user taps the card THEN the System SHALL reveal the back side
3. WHEN a card is displayed THEN the System SHALL show the card's content using markdown rendering
4. WHILE a card's back is revealed THEN the System SHALL display both the front and back sides

### Requirement 4: Card Grading

**User Story:** As a user, I want to grade each card as Correct or Incorrect, so that the system knows how to update the card's review schedule.

#### Acceptance Criteria

1. WHEN a card's back is revealed THEN the System SHALL display both Correct and Incorrect grading buttons
2. WHEN a user selects Correct THEN the System SHALL promote the card to the next box (capped at Box 5)
3. WHEN a user selects Incorrect THEN the System SHALL reset the card to Box 1
4. WHEN a grade is selected THEN the System SHALL set the card's `lastReviewed` to the current date

### Requirement 5: Card Promotion

**User Story:** As a user, I want cards I answer correctly to be promoted to higher boxes, so that they are reviewed less frequently.

#### Acceptance Criteria

1. WHEN a card in Box N is graded Correct THEN the System SHALL promote it to Box N+1
2. IF a card is in Box 5 and graded Correct THEN the System SHALL keep it in Box 5
3. THE System SHALL NOT increase a card's box beyond 5

### Requirement 6: Card Reset

**User Story:** As a user, I want cards I answer incorrectly to be reset to Box 1, so that they are reviewed more frequently.

#### Acceptance Criteria

1. WHEN a card is graded Incorrect THEN the System SHALL reset it to Box 1
2. THE System SHALL set the card's `lastReviewed` to the current date regardless of prior box

### Requirement 7: Persistence

**User Story:** As a user, I want my review progress to be saved, so that my study data persists across sessions.

#### Acceptance Criteria

1. WHEN a card is promoted or reset THEN the System SHALL update the card in the deck via DecksContext
2. WHEN the deck update is complete THEN the System SHALL persist the changes to localStorage
3. IF persistence fails THEN the System SHALL surface an error state to the user

### Requirement 8: Progress Tracking

**User Story:** As a user, I want to track my progress through the review session, so that I know how many cards remain.

#### Acceptance Criteria

1. WHEN a card is graded AND persisted THEN the System SHALL advance to the next card in the due cards list
2. WHEN all due cards are reviewed THEN the System SHALL display a completion summary
3. WHILE a review session is active THEN the System SHALL display a progress indicator

### Requirement 9: Dashboard Due Count

**User Story:** As a user, I want to see the number of due cards for each deck on the dashboard, so that I know what to study.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN the System SHALL calculate the due count for each deck
2. THE System SHALL display the due count as a badge on each deck card
3. THE System SHALL use the same due calculation logic (`isDue()`) as the review session

### Requirement 10: Leitner Interval Calculation

**User Story:** As a developer, I want the Leitner interval calculation to be accurate, so that cards are reviewed at the correct intervals.

#### Acceptance Criteria

1. A card in Box 1 SHALL have a 1-day interval
2. A card in Box 2 SHALL have a 2-day interval
3. A card in Box 3 SHALL have a 4-day interval
4. A card in Box 4 SHALL have an 8-day interval
5. A card in Box 5 SHALL have a 16-day interval

## Correctness Properties

### Property 1: New Cards Are Always Due

*For any* card with `lastReviewed` set to null and *any* current date, the card shall be identified as due for review.

**Validates: Requirements 2, 4, 9**

### Property 2: Interval Boundaries

*For any* card in Box B with `lastReviewed` = D, the card shall be due on date D + interval(B) but shall not be due on date D + interval(B) - 1 day.

**Validates: Requirements 2, 10**

### Property 3: Promotion Capped at Box 5

*For any* card in Box 5, promoting the card shall return the same box value (5).

**Validates: Requirements 3, 5**

### Property 4: Incorrect Always Resets to Box 1

*For any* card in any box, resetting the card shall always return box 1.

**Validates: Requirements 6**

### Property 5: Due Cards Decrease After Review

*For any* deck with N due cards, after grading one card and persisting the update, the deck shall have N-1 due cards.

**Validates: Requirements 7, 8**
