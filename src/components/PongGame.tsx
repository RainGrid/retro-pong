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
  currentBallSpeed: number;
  currentBotSpeed: number;
  botReactionTime: number;
  roundStartTime: number;
}

const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = 500;
const PADDLE_WIDTH = 48;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 5;
const PADDLE_SPEED = 4;

// Dynamic difficulty constants
const BASE_BALL_SPEED = 3;
const MAX_BALL_SPEED = 8;
const BASE_BOT_SPEED = 1.5; // Slower initial bot speed
const MAX_BOT_SPEED = 6;
const BASE_BOT_REACTION = 50; // Much dumber bot at start
const MIN_BOT_REACTION = 8; // Still challenging at max level

// Round speed increase constants
const ROUND_SPEED_INCREASE_TIME = 10000; // 10 seconds
const ROUND_SPEED_INCREASE_AMOUNT = 0.3; // Speed increase per interval
const MAX_ROUND_SPEED_MULTIPLIER = 2.0; // Maximum 2x speed in round

export const PongGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [gameState, setGameState] = useState<GameState>({
    ball: {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      dx: BASE_BALL_SPEED,
      dy: BASE_BALL_SPEED,
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
      speed: BASE_BOT_SPEED,
    },
    playerScore: 0,
    botScore: 0,
    gameRunning: false,
    gameStarted: false,
    currentBallSpeed: BASE_BALL_SPEED,
    currentBotSpeed: BASE_BOT_SPEED,
    botReactionTime: BASE_BOT_REACTION,
    roundStartTime: Date.now(),
  });

  const [sliderValue, setSliderValue] = useState(50);

  // Calculate dynamic difficulty based on scores
  const calculateDifficulty = useCallback(
    (playerScore: number, botScore: number) => {
      const totalScore = playerScore + botScore;

      // Ball speed increases more gradually with total score
      const ballSpeedMultiplier = Math.min(
        1 + totalScore * 0.08,
        MAX_BALL_SPEED / BASE_BALL_SPEED,
      );
      const newBallSpeed = Math.min(
        BASE_BALL_SPEED * ballSpeedMultiplier,
        MAX_BALL_SPEED,
      );

      // Bot speed increases more gradually
      const botSpeedMultiplier = Math.min(
        1 + totalScore * 0.12,
        MAX_BOT_SPEED / BASE_BOT_SPEED,
      );
      const newBotSpeed = Math.min(
        BASE_BOT_SPEED * botSpeedMultiplier,
        MAX_BOT_SPEED,
      );

      // Bot becomes smarter much more gradually - starts very dumb
      // Takes about 10-15 player points to reach challenging level
      const reactionMultiplier = Math.max(
        1 - playerScore * 0.06,
        MIN_BOT_REACTION / BASE_BOT_REACTION,
      );
      const newBotReaction = Math.max(
        BASE_BOT_REACTION * reactionMultiplier,
        MIN_BOT_REACTION,
      );

      return {
        ballSpeed: newBallSpeed,
        botSpeed: newBotSpeed,
        botReaction: newBotReaction,
      };
    },
    [],
  );

  // Calculate round speed multiplier based on round duration
  const calculateRoundSpeedMultiplier = useCallback(
    (roundStartTime: number) => {
      const currentTime = Date.now();
      const roundDuration = currentTime - roundStartTime;

      // Calculate how many speed increase intervals have passed
      const intervalsPassed = Math.floor(
        roundDuration / ROUND_SPEED_INCREASE_TIME,
      );

      // Calculate speed multiplier (1.0 = no increase, 2.0 = double speed)
      const speedMultiplier =
        1.0 + intervalsPassed * ROUND_SPEED_INCREASE_AMOUNT;

      // Cap at maximum multiplier
      return Math.min(speedMultiplier, MAX_ROUND_SPEED_MULTIPLIER);
    },
    [],
  );

  // Initialize game
  const initGame = useCallback(() => {
    const difficulty = calculateDifficulty(0, 0);
    setGameState((prev) => ({
      ...prev,
      ball: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        dx: difficulty.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
        dy: difficulty.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
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
        speed: difficulty.botSpeed,
      },
      playerScore: 0,
      botScore: 0,
      gameRunning: true,
      gameStarted: true,
      currentBallSpeed: difficulty.ballSpeed,
      currentBotSpeed: difficulty.botSpeed,
      botReactionTime: difficulty.botReaction,
      roundStartTime: Date.now(),
    }));
  }, [calculateDifficulty]);

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

  // Bot AI with dynamic difficulty and randomness
  const updateBotPaddle = useCallback(
    (ball: Ball, botPaddle: Paddle, reactionTime: number) => {
      const paddleCenter = botPaddle.x + botPaddle.width / 2;
      const ballCenter = ball.x;

      // Add some randomness to make bot less predictable (more at higher reaction times)
      const randomFactor = Math.random() * (reactionTime * 0.1);
      const adjustedReactionTime = reactionTime + randomFactor;

      // Use dynamic reaction time - higher value = dumber bot
      if (ballCenter < paddleCenter - adjustedReactionTime) {
        return Math.max(0, botPaddle.x - botPaddle.speed);
      } else if (ballCenter > paddleCenter + adjustedReactionTime) {
        return Math.min(
          GAME_WIDTH - botPaddle.width,
          botPaddle.x + botPaddle.speed,
        );
      }
      return botPaddle.x;
    },
    [],
  );

  // Game loop
  const gameLoop = useCallback(() => {
    setGameState((prev) => {
      if (!prev.gameRunning) return prev;

      // Calculate current difficulty
      const difficulty = calculateDifficulty(prev.playerScore, prev.botScore);

      // Calculate round speed multiplier
      const roundSpeedMultiplier = calculateRoundSpeedMultiplier(
        prev.roundStartTime,
      );

      let newBall = { ...prev.ball };
      let newBotPaddle = { ...prev.botPaddle };
      let newPlayerPaddle = { ...prev.playerPaddle };
      let newPlayerScore = prev.playerScore;
      let newBotScore = prev.botScore;

      // Apply round speed multiplier to ball speed
      const baseBallSpeed = difficulty.ballSpeed;
      const currentBallSpeed = baseBallSpeed * roundSpeedMultiplier;

      // Update ball speed based on round duration
      const currentSpeed = Math.sqrt(
        newBall.dx * newBall.dx + newBall.dy * newBall.dy,
      );
      if (currentSpeed > 0) {
        const speedRatio = currentBallSpeed / currentSpeed;
        newBall.dx *= speedRatio;
        newBall.dy *= speedRatio;
      }

      // Update bot speed
      newBotPaddle.speed = difficulty.botSpeed;

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
        // Preserve ball speed, only change direction
        const currentSpeed = Math.sqrt(
          newBall.dx * newBall.dx + newBall.dy * newBall.dy,
        );
        newBall.dx = hitPos * currentSpeed * 0.5;
        newBall.dy = -Math.sqrt(
          currentSpeed * currentSpeed - newBall.dx * newBall.dx,
        );
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
        // Preserve ball speed, only change direction
        const currentSpeed = Math.sqrt(
          newBall.dx * newBall.dx + newBall.dy * newBall.dy,
        );
        newBall.dx = hitPos * currentSpeed * 0.5;
        newBall.dy = Math.sqrt(
          currentSpeed * currentSpeed - newBall.dx * newBall.dx,
        );
      }

      // Score points
      if (newBall.y < 0) {
        newPlayerScore++;
        newBall = {
          x: GAME_WIDTH / 2,
          y: GAME_HEIGHT / 2,
          dx: currentBallSpeed * (Math.random() > 0.5 ? 1 : -1),
          dy: currentBallSpeed,
          radius: BALL_RADIUS,
        };
        // Reset paddles to center positions
        newBotPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        newBotPaddle.y = 20;
        newPlayerPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        newPlayerPaddle.y = GAME_HEIGHT - 30;
        // Reset round timer
        prev.roundStartTime = Date.now();
      } else if (newBall.y > GAME_HEIGHT) {
        newBotScore++;
        newBall = {
          x: GAME_WIDTH / 2,
          y: GAME_HEIGHT / 2,
          dx: currentBallSpeed * (Math.random() > 0.5 ? 1 : -1),
          dy: -currentBallSpeed,
          radius: BALL_RADIUS,
        };
        // Reset paddles to center positions
        newBotPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        newBotPaddle.y = 20;
        newPlayerPaddle.x = GAME_WIDTH / 2 - PADDLE_WIDTH / 2;
        newPlayerPaddle.y = GAME_HEIGHT - 30;
        // Reset round timer
        prev.roundStartTime = Date.now();
      }

      // Update bot paddle with dynamic reaction time
      newBotPaddle.x = updateBotPaddle(
        newBall,
        newBotPaddle,
        difficulty.botReaction,
      );

      return {
        ...prev,
        ball: newBall,
        playerPaddle: newPlayerPaddle,
        botPaddle: newBotPaddle,
        playerScore: newPlayerScore,
        botScore: newBotScore,
        currentBallSpeed: currentBallSpeed,
        currentBotSpeed: difficulty.botSpeed,
        botReactionTime: difficulty.botReaction,
        roundStartTime: prev.roundStartTime,
      };
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [updateBotPaddle, calculateDifficulty, calculateRoundSpeedMultiplier]);

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
    ctx.strokeStyle = '#d1d1d1';
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT / 2);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw paddles
    ctx.fillStyle = '#d1d1d1';
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

    // Draw square ball
    ctx.fillStyle = '#d1d1d1';
    ctx.fillRect(
      gameState.ball.x - gameState.ball.radius,
      gameState.ball.y - gameState.ball.radius,
      gameState.ball.radius * 2,
      gameState.ball.radius * 2
    );

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
      <div className="wrapper">
        <div className="game-container">
          <div className="canvas-container">
            <div className="score-display">
              <div className="score">{gameState.botScore}</div>
              <div className="score">{gameState.playerScore}</div>
            </div>
            <canvas
              ref={canvasRef}
              width={GAME_WIDTH}
              height={GAME_HEIGHT}
              className="game-canvas"
            />
          </div>

          <div className="controls">
            {!gameState.gameStarted ? (
              <button className="start-button" onClick={handleStartGame}>
                Start game
              </button>
            ) : (
              <button className="stop-button" onClick={handleStopGame}>
                End game
              </button>
            )}
          </div>

          <div className="slider-container">
            <input
              id="paddle-slider"
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              className="paddle-slider"
            />
            <label className="slider-title" htmlFor="paddle-slider">
              Hold to move
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
