import { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import InventoryBar from './components/InventoryBar';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('TITLE');
  const [selectedFuel, setSelectedFuel] = useState('REGULAR');
  const [score, setScore] = useState(0);

  const startGame = () => {
    setGameState('PLAYING');
  };

  return (
    <div id="app" style={{
      width: '100vw',
      height: '100dvh',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 9999, color: 'yellow', pointerEvents: 'none' }}>
        React Rendered
      </div>

      {gameState === 'TITLE' && (
        <div className="title-screen" onTouchStart={startGame} onClick={startGame}>
          <h1>REFUEL IT UP</h1>
          <p>TAP TO START</p>
          <p style={{ fontSize: '12px', marginTop: '20px', opacity: 0.7 }}>Ver01.25.22.30.50S</p>
        </div>
      )}

      <div className="hud-score">{score.toString().padStart(6, '0')}</div>

      <GameCanvas
        gameState={gameState}
        selectedFuel={selectedFuel}
        onScore={(pts) => setScore((s) => s + pts)}
      />

      <InventoryBar selected={selectedFuel} onSelect={setSelectedFuel} />
    </div>
  );
}

export default App;
