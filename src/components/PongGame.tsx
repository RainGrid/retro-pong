import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PongGame.css';

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface GameState {
  ball: Ball;
  playerPaddle: Paddle;
  botPaddle: Paddle;
  playerScore: number;
  botScore: number;
  gameRunning: boolean;
  gameStarted: boolean;
}

const GAME_WIDTH = 300;
const GAME_HEIGHT = 500;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const PADDLE_SPEED = 4;
const BALL_SPEED = 3;

export const PongGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>({
    ball: {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      dx: BALL_SPEED,
      dy: BALL_SPEED,
      radius: BALL_RADIUS,
    },
    playerPaddle: {
      x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: GAME_HEIGHT - 30,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: PADDLE_SPEED,
    },
    botPaddle: {
      x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: 20,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: PADDLE_SPEED,
    },
    playerScore: 0,
    botScore: 0,
    gameRunning: false,
    gameStarted: false,
  });

  const [sliderValue, setSliderValue] = useState(50);

  // Initialize game
  const initGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      ball: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        dy: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        radius: BALL_RADIUS,
      },
      playerPaddle: {
        x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
        y: GAME_HEIGHT - 30,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: PADDLE_SPEED,
      },
      botPaddle: {
        x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2,
        y: 20,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        speed: PADDLE_SPEED,
      },
      playerScore: 0,
      botScore: 0,
      gameRunning: true,
      gameStarted: true,
    }));
  }, []);

  // Update player paddle position based on slider
  useEffect(() => {
    if (gameState.gameRunning) {
      const newX = (sliderValue / 100) * (GAME_WIDTH - PADDLE_WIDTH);
      setGameState((prev) => ({
        ...prev,
        playerPaddle: {
          ...prev.playerPaddle,
          x: newX,
        },
      }));
    }
  }, [sliderValue, gameState.gameRunning]);

  // Bot AI
  const updateBotPaddle = useCallback((ball: Ball, botPaddle: Paddle) => {
    const paddleCenter = botPaddle.x + botPaddle.width / 2;
    const ballCenter = ball.x;

    if (ballCenter < paddleCenter - 10) {
      return Math.max(0, botPaddle.x - botPaddle.speed);
    } else if (ballCenter > paddleCenter + 10) {
      return Math.min(
        GAME_WIDTH - botPaddle.width,
        botPaddle.x + botPaddle.speed,
      );
    }
    return botPaddle.x;
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    setGameState((prev) => {
      if (!prev.gameRunning) return prev;

      let newBall = { ...prev.ball };
      let newBotPaddle = { ...prev.botPaddle };
      let newPlayerPaddle = { ...prev.playerPaddle };
      let newPlayerScore = prev.playerScore;
      let newBotScore = prev.botScore;

      // Update ball position
      newBall.x += newBall.dx;
      newBall.y += newBall.dy;

      // Ball collision with left/right walls
      if (
        newBall.x <= newBall.radius ||
        newBall.x >= GAME_WIDTH - newBall.radius
      ) {
        newBall.dx = -newBall.dx;
      }

      // Ball collision with paddles
      const ballLeft = newBall.x - newBall.radius;
      const ballRight = newBall.x + newBall.radius;
      const ballTop = newBall.y - newBall.radius;
      const ballBottom = newBall.y + newBall.radius;

      // Player paddle collision (bottom paddle)
      if (
        ballLeft <= newPlayerPaddle.x + newPlayerPaddle.width &&
        ballRight >= newPlayerPaddle.x &&
        ballTop <= newPlayerPaddle.y + newPlayerPaddle.height &&
        ballBottom >= newPlayerPaddle.y &&
        newBall.dy > 0
      ) {
        newBall.dy = -newBall.dy;
        // Add some angle based on where ball hits paddle
        const hitPos =
          (newBall.x - (newPlayerPaddle.x + newPlayerPaddle.width / 2)) /
          (newPlayerPaddle.width / 2);
        newBall.dx = hitPos * BALL_SPEED;
      }

      // Bot paddle collision (top paddle)
      if (
        ballLeft <= newBotPaddle.x + newBotPaddle.width &&
        ballRight >= newBotPaddle.x &&
        ballTop <= newBotPaddle.y + newBotPaddle.height &&
        ballBottom >= newBotPaddle.y &&
        newBall.dy < 0
      ) {
        newBall.dy = -newBall.dy;
        // Add some angle based on where ball hits paddle
        const hitPos =
          (newBall.x - (newBotPaddle.x + newBotPaddle.width / 2)) /
          (newBotPaddle.width / 2);
        newBall.dx = hitPos * BALL_SPEED;
      }

      // Score points
      if (newBall.y < 0) {
        newPlayerScore++;
        newBall = {
          x: GAME_WIDTH / 2,
          y: GAME_HEIGHT / 2,
          dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
          dy: BALL_SPEED,
          radius: BALL_RADIUS,
        };
        // Reset paddles to center positions
        newBotPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        newBotPaddle.y = 20;
        newPlayerPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        newPlayerPaddle.y = GAME_HEIGHT - 30;
      } else if (newBall.y > GAME_HEIGHT) {
        newBotScore++;
        newBall = {
          x: GAME_WIDTH / 2,
          y: GAME_HEIGHT / 2,
          dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
          dy: -BALL_SPEED,
          radius: BALL_RADIUS,
        };
        // Reset paddles to center positions
        newBotPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        newBotPaddle.y = 20;
        newPlayerPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        newPlayerPaddle.y = GAME_HEIGHT - 30;
      }

      // Update bot paddle
      newBotPaddle.x = updateBotPaddle(newBall, newBotPaddle);

      return {
        ...prev,
        ball: newBall,
        playerPaddle: newPlayerPaddle,
        botPaddle: newBotPaddle,
        playerScore: newPlayerScore,
        botScore: newBotScore,
      };
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [updateBotPaddle]);

  // Start game loop when game is running
  useEffect(() => {
    if (gameState.gameRunning) {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.gameRunning, gameLoop]);

  // Draw game
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT / 2);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(
      gameState.playerPaddle.x,
      gameState.playerPaddle.y,
      gameState.playerPaddle.width,
      gameState.playerPaddle.height,
    );
    ctx.fillRect(
      gameState.botPaddle.x,
      gameState.botPaddle.y,
      gameState.botPaddle.width,
      gameState.botPaddle.height,
    );

    // Draw ball
    ctx.beginPath();
    ctx.arc(
      gameState.ball.x,
      gameState.ball.y,
      gameState.ball.radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Scores are now displayed outside the canvas
  }, [gameState]);

  // Draw on every frame
  useEffect(() => {
    draw();
  }, [draw]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(e.target.value));
  };

  const handleStartGame = () => {
    initGame();
  };

  const handleStopGame = () => {
    setGameState((prev) => ({
      ...prev,
      gameRunning: false,
      gameStarted: false,
    }));
    setSliderValue(50); // Reset slider to center
  };

  return (
    <div className="pong-game">
      <div className="crt-screen">
        <div className="scanlines"></div>
        <div className="game-container">
          <div className="score-display">
            <div className="score">
              BOT
              <br />
              {gameState.botScore}
            </div>
            <div className="score">
              YOU
              <br />
              {gameState.playerScore}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="game-canvas"
          />

          <div className="controls">
            {!gameState.gameStarted ? (
              <button className="start-button" onClick={handleStartGame}>
                START GAME
              </button>
            ) : (
              <button className="stop-button" onClick={handleStopGame}>
                STOP GAME
              </button>
            )}
          </div>

          <div className="slider-container">
            <label htmlFor="paddle-slider">Paddle Control:</label>
            <input
              id="paddle-slider"
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              className="paddle-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
