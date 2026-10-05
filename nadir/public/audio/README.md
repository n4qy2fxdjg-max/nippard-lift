# Sound assets

NADIR synthesises placeholder cues with the Web Audio API, so no files are required.

To use real recordings, add the files to this folder and create `manifest.json` mapping
event names to file names:

```json
{ "questionReveal": "reveal.mp3", "scoreZero": "ghost.mp3", "finalWin": "win.mp3" }
```

Events: questionReveal, answerLocked, scoreTick, scoreLow, scoreZero, jackpotIncrease,
teamEliminated, headToHeadPoint, timerWarning, timerEnd, finalWin, finalLoss, roundIntro, uiClick.
Any event missing from the manifest keeps its synthesised placeholder.
