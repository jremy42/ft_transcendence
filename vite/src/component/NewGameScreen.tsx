import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from '../socket/SocketProvider';
import { IgameInfo, GameStatus } from "../types";
import { useParams } from "react-router-dom";
import { useAuthService } from '../auth/AuthService'
import { Box, CircularProgress, Typography } from "@mui/material";

interface Iprops {
	gameInfo: IgameInfo,
	gameId: string,
	bottomRef: React.RefObject<HTMLInputElement>;
	width: number;
}

const canvasHeight = 600
const canvasWidth = 800
const ballSize = 5

enum LoadingStatus {
	Loading,
	Loaded,
	Failed
}

interface IgameModuleProps {
	setActiveStep: (step: number) => void;
	width: number;
	gameInfo: IgameInfo,
	setGameInfo: (gameInfo: IgameInfo) => void;
	bottomRef: React.RefObject<HTMLInputElement>;
}



export function GameModule({ setActiveStep, width, setGameInfo, gameInfo, bottomRef }: IgameModuleProps) {
	const [loading, setLoading] = useState<LoadingStatus>(LoadingStatus.Loading);
	const [joined, setJoined] = useState<boolean>(false);
	const { socket, customEmit } = useContext(SocketContext);

	const [countdown, setCountdown] = useState<number>(0);

	const { idGame } = useParams<{ idGame: string }>();

	useEffect(() => {
		if (!joined) {
			setJoined(true)
			return
		}
		customEmit('game.join', { gameId: idGame }, (stringResponse: string) => {
			const response = JSON.parse(stringResponse)

			if (response.error) {
				console.log('Game join got error:', response.error);
				setLoading(LoadingStatus.Failed);
			}
			else {
				console.log('game.join', response.gameId, response.gameInfo);
				setGameInfo(response.gameInfo as IgameInfo);
				setLoading(LoadingStatus.Loaded);
			}

		});
	}, [joined]);

	useEffect(() => {
		console.log('gameInfo.status', gameInfo.status);
		if (gameInfo.status === GameStatus.playing || gameInfo.status === GameStatus.start) {
			setActiveStep(2);
		}
		if (gameInfo.status === GameStatus.end) {
			setActiveStep(3);
		}
	}, [gameInfo.status])


	useEffect(() => {
		if (!idGame || !socket) {
			return;
		}
		function onGameUpdate(data: IgameInfo) {
			setGameInfo(data);
		}
		function onCountdown(data: number) {
			console.log('game.countdown', data);
			setCountdown(data);
		}
		socket.on('game.update', onGameUpdate)
		socket.on('game.countdown', onCountdown)
		return () => {
			if (!socket) return;
			socket.off('game.update', onGameUpdate)
			socket.off('game.countdown', onCountdown)
		}
	}, [window.location.pathname])

	if (loading === LoadingStatus.Loading) {
		return (
			<div style={{ display: 'flex', alignItems: 'center', paddingTop: '2rem', paddingBottom: '2rem', justifyContent: 'flex-start' }}>

				<Box sx={{ display: 'flex' }}>
					<CircularProgress />
				</Box>
			</div>
		);
	}

	// TODO: Crash, gameInfo is undefined. game.update est seulement dans gamescreen. game.join envoie un gameInfo pour init ?
	if (loading === LoadingStatus.Loaded && idGame) {
		if (gameInfo.status === GameStatus.waiting || gameInfo.status === GameStatus.playing || gameInfo.status === GameStatus.start) {
			return (
				<>
					{
						gameInfo.status === GameStatus.waiting &&
						<div style={{ display: 'flex', alignItems: 'center', paddingTop: '2rem', paddingBottom: '2rem', justifyContent: 'flex-start' }}>

							<Box sx={{ display: 'flex' }}>
								<CircularProgress />
							</Box>
							<Typography sx={{ pl: 2 }}>Waiting for players</Typography>

						</div>
					}
					{countdown !== 0 &&
						<div style={
							{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								height: '100%',
								backgroundColor: 'rgba(0, 0, 0, 0.5)',
								zIndex: 1,
								transition: 'all 0.5s'
							}
						}>
							<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '50px', color: 'white' }}>
								{countdown}
							</div>
						</div>
					}
					<GameScreen gameInfo={gameInfo} gameId={idGame} bottomRef={bottomRef} width={width} />
				</>
			)
		}
		// if (gameInfo.status === GameStatus.end) {
		// 	return <GameFinishedScreen gameInfo={gameInfo} />
		// }
	}

	return (
		<div>
			Failed to load game (game not found)
		</div>
	);
};



export function GameScreen({ gameInfo, gameId, bottomRef, width }: Iprops): JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const context = useRef<CanvasRenderingContext2D | null>(null);
	const { customEmit } = useContext(SocketContext);
	const [keyDown, setKeyDown] = useState({ up: false, down: false, shoot: false });
	const [canvasRatio, setCanvasRatio] = useState<number>(0.8 * Math.min(width / canvasWidth, window.innerHeight / canvasHeight))
	const [displayInfo, setDisplayInfo] = useState<boolean>(false)

	const handleClick = () => {
		setDisplayInfo(!displayInfo)
	}

	useEffect(() => {
		console.log("width", width);
		setCanvasRatio(0.8 * Math.min(width / canvasWidth, window.innerHeight / canvasHeight))
	}, [width])


	useEffect(() => {
		const interval = setInterval(() => {
			if (keyDown.up) {
				customEmit('game.play.move', { gameId: gameId, move: 'Up' })
			}
			if (keyDown.down) {
				customEmit('game.play.move', { gameId: gameId, move: 'Down' })
			}
			if (keyDown.shoot) {
				customEmit('game.play.move', { gameId: gameId, move: 'Shoot' })
			}
		}, 8);
		return () => clearInterval(interval);
	}, [keyDown])

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			e.preventDefault();
			console.log(`>${e.key}<`)
			if (e.key === 'ArrowUp' && keyDown.up === false) {
				setKeyDown({ up: true, down: false, shoot: false })
			}
			if (e.key === 'ArrowDown' && keyDown.down === false) {
				setKeyDown({ up: false, down: true, shoot: false })
			}
			if (e.key === 'ArrowRight' && keyDown.shoot === false) {
				setKeyDown({ up: false, down: false, shoot: true })
			}
		}
		function handleKeyUp(e: KeyboardEvent) {
			if (e.key === 'ArrowUp') {
				setKeyDown({ up: false, down: false, shoot: false })
			}
			if (e.key === 'ArrowDown') {
				setKeyDown({ up: false, down: false, shoot: false })
			}
			if (e.key === 'ArrowRight') {
				setKeyDown({ up: false, down: false, shoot: false })
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
		}
	}, [])

	useEffect(() => {
		const context2d = canvasRef.current?.getContext('2d');
		if (!context2d) return;

		context.current = context2d;
	}, []); // 1 seul call quand le return est fait

	useEffect(() => {
		if (!context.current) return;

		const player1color = "rgba(255, 100, 100, 1.0)"
		const player2color = "rgba(180, 180, 255, 1.0)"
		const assetcolor = "rgba(100, 100, 100, 1.0)"
		const ballcolor = "rgba(230, 190, 1, 1.0)"

		// Clear canvas
		context.current.clearRect(0, 0, canvasWidth * canvasRatio, canvasHeight * canvasRatio);
		context.current.fillStyle = "rgba(0, 0, 0, 1)";
		context.current.fillRect(0, 0, canvasWidth * canvasRatio, canvasHeight * canvasRatio);

		// Player One
		context.current.fillStyle = player1color
		if (gameInfo.players[0]) {
			context.current.fillRect(0, gameInfo.players[0].pos * canvasRatio, gameInfo.players[0].paddleWidth * canvasRatio, gameInfo.players[0].paddleLength * canvasRatio);
			if (gameInfo.players[0].shoot.active) {
				context.current.beginPath();
				context.current.arc(gameInfo.players[0].shoot.pos.x * canvasRatio, gameInfo.players[0].shoot.pos.y * canvasRatio, ballSize * canvasRatio, 0, 2 * Math.PI)
				context.current.fill();
			}
		}
		// Player Two
		context.current.fillStyle = player2color
		if (gameInfo.players[1]) {
			context.current.fillRect((canvasWidth - gameInfo.players[1].paddleWidth) * canvasRatio, gameInfo.players[1].pos * canvasRatio, gameInfo.players[1].paddleWidth * canvasRatio, gameInfo.players[1].paddleLength * canvasRatio);
			if (gameInfo.players[1].shoot.active) {
				context.current.beginPath();
				context.current.arc(gameInfo.players[1].shoot.pos.x * canvasRatio, gameInfo.players[1].shoot.pos.y * canvasRatio, ballSize * canvasRatio, 0, 2 * Math.PI)
				context.current.fill();
			}
		}

		// Assets
		context.current.fillStyle = assetcolor
		if (gameInfo.assets.length > 0) {
			gameInfo.assets.forEach((asset) => {
				context.current?.fillRect(asset.x * canvasRatio, asset.y * canvasRatio, asset.width * canvasRatio, asset.height * canvasRatio);
			})
		}

		// center line
		context.current.beginPath();
		context.current.strokeStyle = "white";
		context.current.moveTo(canvasWidth * canvasRatio / 2, 0);
		context.current.lineTo(canvasWidth * canvasRatio / 2, canvasHeight * canvasRatio);
		context.current.stroke();

		// Ball
		context.current.fillStyle = ballcolor
		context.current.beginPath();
		context.current.arc(gameInfo.ball.pos.x * canvasRatio, gameInfo.ball.pos.y * canvasRatio, ballSize * canvasRatio, 0, 2 * Math.PI)
		context.current.fill();

		// Scores
		context.current.font = `${48 * canvasRatio}px serif`
		context.current.fillText(`${gameInfo.players[0].score}`, (canvasWidth / 2 - 80) * canvasRatio, 80 * canvasRatio)
		if (gameInfo.players[1])
			context.current.fillText(`${gameInfo.players[1].score}`, (canvasWidth / 2 + 60) * canvasRatio, 80 * canvasRatio)

		// Player Info
		context.current.font = `${20 * canvasRatio}px serif`
		context.current.fillStyle = player1color
		context.current.fillText(`${gameInfo.players[0].user.username}`, 5 * canvasRatio, 20 * canvasRatio)
		context.current.fillStyle = player2color
		if (gameInfo.players[1]) {
			const player2username = gameInfo.players[1].user.username
			context.current.fillText(player2username, canvasWidth * canvasRatio - (5 * canvasRatio + context.current.measureText(player2username).width), 20 * canvasRatio)
		}

	}, [gameInfo.players, gameInfo.ball.pos]);

	return (
		<div>
			<button onClick={handleClick}>{(displayInfo) ? "Hide" : "Show" + " Info"}</button>
			<div> {displayInfo ?
				<>
					<div> <h1>Game Info :</h1></div>
					<div> Velocity x :{(gameInfo?.ball.velocity.x)} </div>
					<div> Velocity y :{(gameInfo?.ball.velocity.y)} </div>
					<div> posBall x :{gameInfo?.ball.pos.x} </div>
					<div> posBall y: {gameInfo?.ball.pos.y} </div>
					<div> posP1: {gameInfo?.players[0].pos} </div>
					<div> momentumP1: {gameInfo?.players[0].momentum} </div>
					<div> paddleLengthP1: {gameInfo?.players[0].paddleLength} </div>
					<div> posP2: {gameInfo?.players[1]?.pos} </div>
					<div> momentumP2: {gameInfo?.players[1]?.momentum} </div>
					<div> paddleLengthP2: {gameInfo?.players[1]?.paddleLength} </div>
					<div> score: {`${gameInfo?.players[0].score}:${gameInfo?.players[1]?.score}`} </div>
					<div> status: {gameInfo?.status} </div>
					<div> date: {gameInfo?.date.toString()} </div>
				</> : <></>}
			</div>
			<div>
				<canvas width={canvasWidth * canvasRatio} height={canvasHeight * canvasRatio} style={{
					border: "1px solid black", display: "block", marginLeft: "auto", marginRight: "auto"
				}} ref={canvasRef} />
			</div>
			<div ref={bottomRef} style={{ height: "10px" }}>
			</div>
		</div>
	)
}
