import React from 'react';
import './ProgressMeter.css';

function ProgressMeter({pomodoroCount, isReset}) {
  return (
    <div className="progress-meter">
      {isReset && pomodoroCount > 0 && (
        <p className="progress-meter__message">Great job! Take a <strong>{pomodoroCount % 4 === 0 ? 15 : 5}</strong> minute break and then start again!</p>
      )}
      <p>Pomodoros Completed: <span className="progress-meter__meter">{'🍅'.repeat(pomodoroCount)}</span></p>
    </div>
  )
}

export default ProgressMeter;