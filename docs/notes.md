A new deck must create an json file with the name of the deck in the folder /deck
A new card must be saved in its /deck/<deck>.json file

When a study session finnishes the deck must be exported to the folder /study_data
- if the file already exists, it must be overriden

Whem the app starts it must load decks form the folders `/deck` or `/study_data`
- IF the /study_data folder has precedence

Option to reset the deck (it deletes the deck from /study_data folder)

All data will be stored and retrieved from files in the folders `/deck` or `/study_data`.The browser localStorage is not needed anymore.
